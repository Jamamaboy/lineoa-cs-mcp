import { z } from "zod";
import { LineOAError } from "./errors.js";

// A lenient check on the few raw fields we rely on. The research fixtures are synthetic, so this must never be
// stricter than "the key fields exist with the right type": extra and null fields are fine.
const RawMessage = z.looseObject({ id: z.string(), type: z.string() });

export const RawEventSchema = z.looseObject({
  type: z.string().nullish(),
  timestamp: z.number().nullish(),
  message: RawMessage.nullish(),
});

export const RawChatSchema = z.looseObject({
  chatId: z.string(),
  read: z.boolean().nullish(),
  done: z.boolean().nullish(),
  profile: z.looseObject({ name: z.string().nullish() }).nullish(),
  latestEvent: RawEventSchema.nullish(),
});

const changed = (where: string, issue: z.core.$ZodIssue | undefined) =>
  new LineOAError(
    "ENDPOINT_CHANGED",
    `${where}: ${issue?.path.join(".") || "(item)"} ${issue?.message ?? "has an unexpected shape"}. The internal API may have changed.`,
  );

/**
 * Validates each item. One odd item is skipped (with a warning that never includes message text), so it can't break
 * a whole list; but if most items are bad, or a key field is missing on every item, LINE has probably changed.
 */
export function checkList<T>(
  items: unknown[],
  schema: z.ZodType,
  where: string,
  keyFields: string[] = [],
): T[] {
  const good: T[] = [];
  let bad = 0;
  let firstIssue: z.core.$ZodIssue | undefined;
  for (const item of items) {
    const r = schema.safeParse(item);
    if (r.success) good.push(item as T);
    else {
      bad++;
      firstIssue ??= r.error.issues[0];
    }
  }
  if (bad * 2 > items.length) throw changed(where, firstIssue);
  if (items.length > 0) {
    for (const key of keyFields) {
      if (items.every((i) => (i as Record<string, unknown> | null)?.[key] === undefined))
        throw changed(where, {
          code: "custom",
          path: [key],
          message: "is missing from every item",
        } as z.core.$ZodIssue);
    }
  }
  if (bad)
    console.error(
      `[lineoa] ${where}: skipped ${bad} of ${items.length} items (${firstIssue?.path.join(".") || "(item)"} ${firstIssue?.message ?? "invalid"})`,
    );
  return good;
}

export function checkOne<T>(value: unknown, schema: z.ZodType, where: string): T {
  const r = schema.safeParse(value);
  if (!r.success) throw changed(where, r.error.issues[0]);
  return value as T;
}
