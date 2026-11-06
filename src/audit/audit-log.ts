import { createHash } from "node:crypto";
import {
  appendFileSync,
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  statSync,
} from "node:fs";
import { dirname } from "node:path";
import { isPlainObject } from "../domain/json.js";

/** The last byte of a file (undefined when missing or empty), read without loading the whole log. */
function lastByte(file: string): number | undefined {
  const size = statSync(file, { throwIfNoEntry: false })?.size ?? 0;
  if (size === 0) return undefined;
  const fd = openSync(file, "r");
  try {
    const b = Buffer.alloc(1);
    readSync(fd, b, 0, 1, size - 1);
    return b[0];
  } finally {
    closeSync(fd);
  }
}

export interface SendRecord {
  at: string;
  botId: string;
  chatId: string;
  sendId?: string;
  dryRun: boolean;
  outcome: "sent" | "uncertain" | "dry_run" | "refused" | "failed";
  reason?: string;
  /** The text itself is not logged: only its length and a hash, so the log holds no customer data. */
  textLength: number;
  textSha256: string;
}

/** Append-only JSON-lines log of every send attempt, so a person can see what the agent did. */
export class AuditLog {
  constructor(private readonly file: string) {}

  record(r: Omit<SendRecord, "at" | "textLength" | "textSha256"> & { text: string }): void {
    const { text, ...rest } = r;
    const line: SendRecord = {
      at: new Date().toISOString(),
      ...rest,
      textLength: text.length,
      textSha256: createHash("sha256").update(text).digest("hex").slice(0, 16),
    };
    if (this.file === ":memory:") return void this.memory.push(line);
    mkdirSync(dirname(this.file), { recursive: true, mode: 0o700 });
    // A crash can leave a torn last line; start on a fresh line so the next record stays readable.
    const last = lastByte(this.file);
    const torn = last !== undefined && last !== 0x0a;
    appendFileSync(this.file, `${torn ? "\n" : ""}${JSON.stringify(line)}\n`, { mode: 0o600 });
  }

  /** How many messages may have gone out today (local time), for the daily cap. Uncertain sends count. */
  sentToday(): number {
    const today = new Date().toDateString();
    return this.lines().filter(
      (l) =>
        (l.outcome === "sent" || l.outcome === "uncertain") &&
        (l.at === undefined || new Date(l.at).toDateString() === today),
    ).length;
  }

  private memory: SendRecord[] = [];
  private warned = false;
  private lines(): Partial<SendRecord>[] {
    if (this.file === ":memory:") return this.memory;
    if (!existsSync(this.file)) return [];
    let mtime: string | undefined; // looked up once, only if a bad line exists
    return readFileSync(this.file, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((l): Partial<SendRecord> => {
        try {
          const v: unknown = JSON.parse(l);
          if (isPlainObject(v)) return v as Partial<SendRecord>;
        } catch {}
        // Unreadable line: assume a message may have gone out, so the daily cap errs on the safe side.
        // Dated by the file mtime, so while the log keeps growing it counts toward today (one extra per bad line).
        if (!this.warned) {
          this.warned = true;
          process.stderr.write(`audit log ${this.file} has a bad line; counting it as a send\n`);
        }
        mtime ??= statSync(this.file).mtime.toISOString();
        return { outcome: "uncertain", at: mtime };
      });
  }
}
