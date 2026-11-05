import { styleText } from "node:util";

/** Small helpers for readable terminal output. Colors turn off by themselves when piped (NO_COLOR too). */
type Style = Parameters<typeof styleText>[0];
const paint = (style: Style, s: string) =>
  process.stdout.isTTY && !process.env.NO_COLOR ? styleText(style, s) : s;

export const ui = {
  title: (s: string) => console.log(`\n${paint(["bold", "green"], `▌ ${s}`)}`),
  ok: (s: string) => console.log(`${paint("green", "✓")} ${s}`),
  warn: (s: string) => console.log(`${paint("yellow", "!")} ${s}`),
  fail: (s: string) => console.error(`${paint("red", "✗")} ${s}`),
  dim: (s: string) => paint("gray", s),
  bold: (s: string) => paint("bold", s),
  cyan: (s: string) => paint("cyan", s),
  line: (s = "") => console.log(s),
};

export function when(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" });
}

export const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
