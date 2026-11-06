// npm run smoke: runs the BUILT terminal command against the built-in mock, so a broken dist/ fails CI.
import { spawnSync } from "node:child_process";

const r = spawnSync(process.execPath, ["dist/src/cli.js", "status"], {
  env: { ...process.env, LINEOA_MOCK: "1", LINEOA_MOCK_PORT: "0" },
  encoding: "utf8",
});
const out = `${r.stdout}${r.stderr}`;
if (r.status !== 0 || !out.includes("Demo Shop")) {
  console.error(`smoke failed (exit ${r.status}):\n${out}`);
  process.exit(1);
}
console.log("smoke ok: dist/src/cli.js status on the mock lists Demo Shop");
