import { describe, expect, it } from "vitest";
import { startStack } from "./helpers.js";

const NOK = "Uc5000000000000000000000000000002";

describe("send_message", () => {
  it("does not exist unless LINEOA_ALLOW_SEND=true", async () => {
    const s = await startStack();
    const { tools } = await s.client.listTools();
    expect(tools.map((t) => t.name)).not.toContain("send_message");
    await s.stop();
  });

  it("previews with dryRun, then sends, and the message shows up in the chat", async () => {
    const s = await startStack({ LINEOA_ALLOW_SEND: "true" });
    const tool = (await s.client.listTools()).tools.find((t) => t.name === "send_message");
    expect(tool?.annotations?.destructiveHint).toBe(true);
    const preview = await s.call("send_message", { chatId: NOK, text: "ขอโทษค่ะ", dryRun: true });
    expect(preview.json).toMatchObject({ dryRun: true, wouldSendTo: "นก 🌸" });
    const sent = await s.call("send_message", { chatId: NOK, text: "ขอโทษค่ะ เดี๋ยวคืนเงินให้นะคะ" });
    expect(sent.json.sent).toBe(true);
    expect(sent.json.messageId).toBeTypeOf("string");
    const chat = await s.call("read_chat", { chatId: NOK });
    const last = chat.json.messages.at(-1);
    expect(last).toMatchObject({ from: "staff", text: "ขอโทษค่ะ เดี๋ยวคืนเงินให้นะคะ" });
    await s.stop();
  });

  it("refuses chats outside the allowlist and stops at the daily limit", async () => {
    const s = await startStack({
      LINEOA_ALLOW_SEND: "true",
      LINEOA_SEND_CHAT_ALLOWLIST: NOK,
      LINEOA_SEND_DAILY_LIMIT: "1",
    });
    const other = await s.call("send_message", { chatId: "Uc5000000000000000000000000000001", text: "hi" });
    expect(other.text).toMatch(/^SEND_DISABLED: .*ALLOWLIST/);
    expect((await s.call("send_message", { chatId: NOK, text: "one" })).json.sent).toBe(true);
    expect((await s.call("send_message", { chatId: NOK, text: "two" })).text).toMatch(/Daily send limit/);
    await s.stop();
  });
});
