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

// en-GB keeps the Gregorian year ("5 Nov 2026, 12:00"); th-TH would print the Buddhist era (69).
const dateTime = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function when(iso?: string): string {
  if (!iso) return "";
  return dateTime.format(new Date(iso));
}

/** Find chats by name: exact (ignoring case and edge spaces) first, names that merely contain the query second. */
export function matchChats<T extends { name: string }>(chats: T[], query: string) {
  const q = query.trim().toLowerCase();
  const exact = chats.filter((c) => c.name.trim().toLowerCase() === q);
  const partial = exact.length ? [] : chats.filter((c) => c.name.toLowerCase().includes(q));
  return { exact, partial };
}

export const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
