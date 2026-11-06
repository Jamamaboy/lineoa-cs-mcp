import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";

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
    appendFileSync(this.file, `${JSON.stringify(line)}\n`, { mode: 0o600 });
  }

  /** How many messages may have gone out today (local time), for the daily cap. Uncertain sends count. */
  sentToday(): number {
    const today = new Date().toDateString();
    return this.lines().filter(
      (l) => (l.outcome === "sent" || l.outcome === "uncertain") && new Date(l.at).toDateString() === today,
    ).length;
  }

  private memory: SendRecord[] = [];
  private lines(): SendRecord[] {
    if (this.file === ":memory:") return this.memory;
    if (!existsSync(this.file)) return [];
    return readFileSync(this.file, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l) as SendRecord);
  }
}
