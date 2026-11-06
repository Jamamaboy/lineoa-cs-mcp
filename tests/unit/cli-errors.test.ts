import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { matchChats, when } from "../../src/cli/ui.js";

// Real processes, always against the built-in mock on a free port, so nothing reaches the real LINE.
function run(entry: "src/index.ts" | "src/cli.ts", args: string[], extra: Record<string, string> = {}) {
  const r = spawnSync(process.execPath, ["--import", "tsx", entry, ...args], {
    env: { ...process.env, LINEOA_MOCK: "1", LINEOA_MOCK_PORT: "0", ...extra },
    encoding: "utf8",
    input: "",
  });
  return { status: r.status, out: r.stdout, err: r.stderr, all: `${r.stdout}\n${r.stderr}` };
}
const STACK = /^\s+at /m;

describe("start-up errors", () => {
  it("server config error is one stderr line", () => {
    const r = run("src/index.ts", [], { LINEOA_SEND_DAILY_LIMIT: "abc" });
    expect(r.status).toBe(1);
    expect(r.err).toContain("lineoa-cs: CONFIG_ERROR:");
    expect(r.err).not.toMatch(STACK);
  });

  it.each([
    ["chats", "--bogus"],
    ["chats", "--oa"],
  ])("unknown CLI option is a one-line error: %s %s", (...args) => {
    const r = run("src/cli.ts", args);
    expect(r.status).toBe(1);
    expect(r.all).toContain("✗");
    expect(r.all).toContain("help");
    expect(r.all).not.toMatch(STACK);
  });
});

describe("read by name", () => {
  const read = (name: string) => run("src/cli.ts", ["read", name, "--oa", "Demo Shop"]);

  it("opens an exact name and prints its id", () => {
    const r = read("นก 🌸");
    expect(r.status).toBe(0);
    expect(r.out).toContain("นก 🌸");
    expect(r.out).toMatch(/→ นก 🌸 \(\S+\)/);
  });

  it("never opens a partial match", () => {
    const r = read("นก");
    expect(r.status).toBe(1);
    expect(r.all).toContain("Did you mean");
    expect(r.out).not.toContain("customer");
  });

  it("says only 125 chats were searched", () => {
    const r = read("no such person");
    expect(r.status).toBe(1);
    expect(r.all).toContain("125");
  });
});

describe("matchChats", () => {
  const chats = [
    { name: "Mint", chatId: "a" },
    { name: " mint ", chatId: "b" },
    { name: "Mint Chanakarn", chatId: "c" },
  ];
  it("finds exact matches ignoring case and edge spaces, including duplicates", () => {
    expect(matchChats(chats, "MINT").exact.map((c) => c.chatId)).toEqual(["a", "b"]);
  });
  it("offers partial matches only when nothing is exact", () => {
    const r = matchChats(chats, "chana");
    expect(r.exact).toEqual([]);
    expect(r.partial.map((c) => c.chatId)).toEqual(["c"]);
  });
  it("returns nothing for an unknown name", () => {
    expect(matchChats(chats, "zzz")).toEqual({ exact: [], partial: [] });
  });
});

describe("when", () => {
  it("prints the Gregorian year, not the Buddhist era", () => {
    const s = when("2026-11-05T05:00:00Z");
    expect(s).toContain("2026");
    expect(s).not.toContain("/69");
  });
});
