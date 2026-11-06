import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AuditLog } from "../../src/audit/audit-log.js";
import { writeSession } from "../../src/auth/session-file.js";
import { fileSource } from "../../src/auth/session-source.js";
import { claudeAddArgs, setup } from "../../src/cli/setup.js";
import { createLineClient } from "../../src/client/line-client.js";
import { loadConfig } from "../../src/config.js";
import { VERSION } from "../../src/version.js";

const tmp = () => mkdtempSync(join(tmpdir(), "lineoa-"));
const posix = process.platform !== "win32";

describe("session file", () => {
  it("corrupt session file means AUTH_EXPIRED", async () => {
    const file = join(tmp(), "session.json");
    writeFileSync(file, "{not json");
    expect(fileSource(file).cookieFor("chat.line.biz")).toBeUndefined();
    writeFileSync(file, "5");
    expect(fileSource(file).cookieFor("chat.line.biz")).toBeUndefined();
    writeFileSync(file, "{not json");
    const client = createLineClient(loadConfig({ LINEOA_SESSION_FILE: file }));
    await expect(client.me()).rejects.toMatchObject({ code: "AUTH_EXPIRED" });
  });

  it("session write replaces a stale tmp with 0600", () => {
    const dir = tmp();
    const file = join(dir, "session.json");
    writeFileSync(`${file}.tmp`, "stale", { mode: 0o644 });
    writeSession(file, { cookies: [] });
    expect(existsSync(`${file}.tmp`)).toBe(false);
    expect(JSON.parse(readFileSync(file, "utf8"))).toEqual({ cookies: [] });
    if (posix) expect(statSync(file).mode & 0o777).toBe(0o600);
  });
});

describe("audit log", () => {
  it("corrupt or non-object audit line counts as a send", () => {
    const file = join(tmp(), "audit.jsonl");
    const sent = { at: new Date().toISOString(), outcome: "sent" };
    writeFileSync(file, `{bad\nnull\n5\n${JSON.stringify(sent)}\n`);
    expect(new AuditLog(file).sentToday()).toBe(4);
  });
});

describe("setup", () => {
  const saved = { HOME: process.env.HOME, PATH: process.env.PATH, APPDATA: process.env.APPDATA };
  let home: string;
  let desktop: string;
  beforeEach(() => {
    home = tmp();
    // An empty PATH hides the real `claude` CLI, so a non-dry run only touches the temp Desktop config.
    process.env.PATH = tmp();
    process.env.HOME = home;
    process.env.APPDATA = home;
    const dir =
      process.platform === "darwin"
        ? join(home, "Library", "Application Support", "Claude")
        : process.platform === "win32"
          ? join(home, "Claude")
          : join(home, ".config", "Claude");
    mkdirSync(dir, { recursive: true });
    desktop = join(dir, "claude_desktop_config.json");
  });
  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });
  const backups = () => readdirSync(join(desktop, "..")).filter((f) => f.includes(".bak-"));

  it("setup leaves a corrupt Desktop config untouched", () => {
    writeFileSync(desktop, "{oops");
    const steps = setup();
    expect(readFileSync(desktop, "utf8")).toBe("{oops");
    expect(backups()).toEqual([]);
    expect(steps[0]).toMatchObject({ done: false });
    expect(steps[0]?.detail).toContain("is not valid JSON");
  });

  it("setup keeps existing env and old backups", () => {
    const old = { command: "x", args: [], env: { LINEOA_BOT_ALLOWLIST: "U1", LINEOA_ALLOW_SEND: "true" } };
    writeFileSync(desktop, JSON.stringify({ theme: "dark", mcpServers: { "lineoa-cs": old } }));
    writeFileSync(`${desktop}.bak-20200101-000000`, "keep me");
    setup({ allowSend: false });
    setup({ allowSend: false });
    const cfg = JSON.parse(readFileSync(desktop, "utf8"));
    expect(cfg.theme).toBe("dark");
    expect(cfg.mcpServers["lineoa-cs"].env).toEqual({
      LINEOA_BOT_ALLOWLIST: "U1",
      LINEOA_ALLOW_SEND: "false",
    });
    expect(readFileSync(`${desktop}.bak-20200101-000000`, "utf8")).toBe("keep me");
    expect(backups().length).toBe(3);
  });

  it("setup --mock writes only lineoa-cs-mock", () => {
    const real = { command: "x", args: ["a"], env: { LINEOA_ALLOW_SEND: "false" } };
    writeFileSync(desktop, JSON.stringify({ mcpServers: { "lineoa-cs": real } }));
    setup({ mock: true });
    const cfg = JSON.parse(readFileSync(desktop, "utf8"));
    expect(JSON.stringify(cfg.mcpServers["lineoa-cs"])).toBe(JSON.stringify(real));
    expect(cfg.mcpServers["lineoa-cs-mock"].env).toEqual({
      LINEOA_MOCK: "1",
      LINEOA_MOCK_PORT: "0",
      LINEOA_ALLOW_SEND: "true",
    });
  });

  it("setup --mock --dry-run writes nothing", () => {
    writeFileSync(desktop, "{}");
    setup({ mock: true, dryRun: true });
    expect(readFileSync(desktop, "utf8")).toBe("{}");
    expect(backups()).toEqual([]);
  });

  it("claude mcp add gets -e for every env key", () => {
    const args = claudeAddArgs("n", { A: "1", B: "2" }, "node", ["x.js"]);
    expect(args).toEqual([
      "mcp",
      "add",
      "--scope",
      "user",
      "n",
      "-e",
      "A=1",
      "-e",
      "B=2",
      "--",
      "node",
      "x.js",
    ]);
  });
});

describe("version", () => {
  it("version matches package.json", () => {
    const pkg = JSON.parse(readFileSync(join(import.meta.dirname, "..", "..", "package.json"), "utf8"));
    expect(VERSION).toBe(pkg.version);
  });
});
