import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const NAME = "lineoa-cs";
const MOCK_NAME = "lineoa-cs-mock";
// On Windows the npm-installed `claude` is claude.cmd, which only runs through a shell.
const WIN = process.platform === "win32";
/** cmd.exe joins arguments with spaces: quote paths with spaces, refuse characters cmd would interpret. */
export function winQuote(arg: string): string {
  if (/["%^&|<>]/.test(arg))
    throw new Error(
      `Cannot pass ${JSON.stringify(arg)} through cmd.exe; move the project to a simpler path.`,
    );
  return /\s/.test(arg) ? `"${arg}"` : arg;
}

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

interface Entry {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

/** The Desktop config with `name` set to `entry`; every other server and top-level key stays as it was. */
export function buildDesktopConfig(existing: Record<string, unknown>, name: string, entry: Entry) {
  const servers = existing.mcpServers;
  const others = servers && typeof servers === "object" && !Array.isArray(servers) ? servers : {};
  return { ...existing, mcpServers: { ...others, [name]: entry } };
}

/** Arguments for `claude mcp add`: one -e per env key, then the command after `--`. */
export function claudeAddArgs(name: string, env: Record<string, string>, command: string, args: string[]) {
  return [
    "mcp",
    "add",
    "--scope",
    "user",
    name,
    ...Object.entries(env).flatMap(([k, v]) => ["-e", `${k}=${v}`]),
    "--",
    command,
    ...args,
  ];
}

const pad = (n: number) => String(n).padStart(2, "0");
/** `<file>.bak-YYYYMMDD-HHMMSS` in local time; a second run in the same second gets a -N suffix, never an overwrite. */
function backupPath(file: string): string {
  const d = new Date();
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const base = `${file}.bak-${stamp}`;
  let path = base;
  for (let n = 2; existsSync(path); n++) path = `${base}-${n}`;
  return path;
}

/** Reads the Desktop config: `{}` when absent, `undefined` when it is not a JSON object. */
function readDesktopConfig(file: string): Record<string, unknown> | undefined {
  if (!existsSync(file)) return {};
  try {
    const v: unknown = JSON.parse(readFileSync(file, "utf8"));
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Adds the server to Claude Desktop (config file, backed up first) and to Claude Code (if installed).
 * `mock` registers only `lineoa-cs-mock` and never touches the real `lineoa-cs` entry.
 */
export function setup(opts: { dryRun?: boolean; allowSend?: boolean; mock?: boolean } = {}): SetupStep[] {
  const { command, args } = serverCommand();
  const name = opts.mock ? MOCK_NAME : NAME;
  const steps: SetupStep[] = [];

  const file = desktopConfigPath();
  const desktopInstalled = existsSync(dirname(file));
  // The mock needs no real session: src/mock-env.ts forces the mock URL, cookie and in-memory audit log.
  const baseEnv = (old?: Record<string, string>): Record<string, string> =>
    opts.mock
      ? { LINEOA_MOCK: "1", LINEOA_MOCK_PORT: "0", LINEOA_ALLOW_SEND: "true" }
      : { ...old, LINEOA_ALLOW_SEND: opts.allowSend ? "true" : "false" };

  if (!desktopInstalled) {
    steps.push({
      target: "Claude Desktop",
      done: false,
      detail:
        "not found. Install Claude Desktop from https://claude.ai/download, then run npm run setup again (skip this if you use Claude Code).",
    });
  } else {
    const cfg = readDesktopConfig(file);
    if (!cfg) {
      steps.push({
        target: "Claude Desktop",
        done: false,
        detail: `${file} is not valid JSON; left it unchanged. Fix or remove it, then run setup again.`,
      });
    } else {
      const servers = cfg.mcpServers as Record<string, Entry> | undefined;
      const old = opts.mock ? undefined : servers?.[name]?.env;
      const entry: Entry = { command, args, env: baseEnv(old) };
      let backup = "";
      if (!opts.dryRun) {
        if (existsSync(file)) {
          backup = backupPath(file);
          copyFileSync(file, backup);
        }
        mkdirSync(dirname(file), { recursive: true });
        // Write then rename, so a crash mid-write never leaves a truncated config.
        writeFileSync(`${file}.tmp`, JSON.stringify(buildDesktopConfig(cfg, name, entry), null, 2));
        renameSync(`${file}.tmp`, file);
      }
      steps.push({
        target: "Claude Desktop",
        done: !opts.dryRun,
        detail: `${file} (${name}${backup ? `, backup: ${backup}` : ""}) · restart the app`,
      });
    }
  }

  let claudeCode = false;
  try {
    execFileSync("claude", ["--version"], { stdio: "ignore", shell: WIN });
    claudeCode = true;
  } catch {}
  if (!claudeCode) {
    steps.push({ target: "Claude Code", done: false, detail: "not installed (skipped)" });
  } else {
    // `claude mcp` can't show the old env, so a live re-run passes only the env we have.
    const addArgs = claudeAddArgs(name, baseEnv(), command, args);
    if (!opts.dryRun) {
      try {
        execFileSync("claude", ["mcp", "remove", "--scope", "user", name], { stdio: "ignore", shell: WIN });
      } catch {}
      execFileSync("claude", WIN ? addArgs.map(winQuote) : addArgs, { stdio: "ignore", shell: WIN });
    }
    steps.push({
      target: "Claude Code",
      done: !opts.dryRun,
      detail: `claude ${addArgs.slice(0, 5).join(" ")} …`,
    });
  }
  return steps;
}
