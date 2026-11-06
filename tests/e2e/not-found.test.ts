import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startStack } from "./helpers.js";

let stack: Awaited<ReturnType<typeof startStack>>;
beforeAll(async () => {
  stack = await startStack();
});
afterAll(async () => stack.stop());

describe("an unknown chat", () => {
  it("unknown chat says use list_chats", async () => {
    for (const tool of ["read_chat", "get_user_profile"]) {
      const r = await stack.call(tool, { oa: "Demo Shop", chatId: "nonexist" });
      expect(r.isError).toBe(true);
      expect(r.text).toMatch(/^NOT_FOUND:/);
      expect(r.text).toContain("list_chats");
      expect(r.text).not.toContain("/api/");
    }
  });
});
