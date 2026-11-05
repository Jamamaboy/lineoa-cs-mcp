import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const NAME = "lineoa-cs";

/** How an AI app should start this server: absolute paths, because GUI apps don't share the shell's PATH. */
export function serverCommand(): { command: string; args: string[] } {
  const tsx = import.meta.resolve("tsx");
  return { command: process.execPath, args: ["--import", tsx, join(ROOT, "src", "index.ts")] };
}

function desktopConfigPath(): string {
  if (process.platform === "darwin")
    return join(homedir(), "Library", "Application Support", "Claude", "claude_desktop_config.json");
  if (process.platform === "win32")
    return join(process.env.APPDATA ?? homedir(), "Claude", "claude_desktop_config.json");
  return join(homedir(), ".config", "Claude", "claude_desktop_config.json");
}

export interface SetupStep {
  target: string;
  done: boolean;
  detail: string;
}

/** Adds the server to Claude Desktop (config file, backed up first) and to Claude Code (if installed). */
export function setup(opts: { dryRun?: boolean; allowSend?: boolean } = {}): SetupStep[] {
  const { command, args } = serverCommand();
  const env = { LINEOA_ALLOW_SEND: opts.allowSend ? "true" : "false" };
  const steps: SetupStep[] = [];

  const file = desktopConfigPath();
  const desktopInstalled = existsSync(dirname(file));
  if (!desktopInstalled) {
    steps.push({ target: "Claude Desktop", done: false, detail: "not installed (skipped)" });
  } else {
    const cfg = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
    cfg.mcpServers = { ...(cfg.mcpServers ?? {}), [NAME]: { command, args, env } };
    if (!opts.dryRun) {
      if (existsSync(file)) copyFileSync(file, `${file}.bak`);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, JSON.stringify(cfg, null, 2));
    }
    steps.push({
      target: "Claude Desktop",
      done: !opts.dryRun,
      detail: `${file} (backup: .bak) · restart the app`,
    });
  }

  let claudeCode = false;
  try {
    execFileSync("claude", ["--version"], { stdio: "ignore" });
    claudeCode = true;
  } catch {}
  if (!claudeCode) {
    steps.push({ target: "Claude Code", done: false, detail: "not installed (skipped)" });
  } else {
    const addArgs = [
      "mcp",
      "add",
      "--scope",
      "user",
      NAME,
      "-e",
      `LINEOA_ALLOW_SEND=${env.LINEOA_ALLOW_SEND}`,
      "--",
      command,
      ...args,
    ];
    if (!opts.dryRun) {
      try {
        execFileSync("claude", ["mcp", "remove", "--scope", "user", NAME], { stdio: "ignore" });
      } catch {}
      execFileSync("claude", addArgs, { stdio: "ignore" });
    }
    steps.push({
      target: "Claude Code",
      done: !opts.dryRun,
      detail: `claude ${addArgs.slice(0, 5).join(" ")} …`,
    });
  }
  return steps;
}
