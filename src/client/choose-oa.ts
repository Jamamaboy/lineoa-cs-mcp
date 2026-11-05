import { LineOAError } from "../domain/errors.js";
import type { Bot } from "../domain/types.js";

/**
 * Picks the OA a request is about. `wanted` may be the OA's name, its @id or its botId; a unique partial
 * name also works. With no `wanted`, a single OA or LINEOA_DEFAULT_OA is used; otherwise the agent gets
 * CHOOSE_OA with the list, so it asks the human instead of guessing.
 */
export function chooseOa(bots: Bot[], wanted?: string, fallback?: string): Bot {
  if (!bots.length) throw new LineOAError("NOT_FOUND", "This staff account cannot reach any LINE OA.");
  const names = bots.map((b) => `"${b.name}"${b.searchId ? ` (${b.searchId})` : ""}`).join(", ");
  const target = wanted?.trim() || fallback?.trim();
  if (!target) {
    if (bots.length === 1) return bots[0] as Bot;
    throw new LineOAError(
      "CHOOSE_OA",
      `This account can reach ${bots.length} OAs: ${names}. Ask the person which OA they mean, then call again with oa set to its name.`,
    );
  }
  const t = target.toLowerCase();
  const exact = bots.find(
    (b) =>
      b.botId === target ||
      b.name.toLowerCase() === t ||
      b.searchId?.toLowerCase() === t ||
      b.searchId === `@${target}`,
  );
  if (exact) return exact;
  const partial = bots.filter((b) => b.name.toLowerCase().includes(t));
  if (partial.length === 1) return partial[0] as Bot;
  throw new LineOAError(
    partial.length ? "CHOOSE_OA" : "NOT_FOUND",
    `${partial.length ? "More than one" : "No"} OA matches "${target}". This account can reach: ${names}.`,
  );
}
