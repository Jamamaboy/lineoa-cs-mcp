import type { LineOAClient } from "../client/line-client.js";
import type { MessageStore } from "./store.js";

export interface SyncLimits {
  /** How many of the most recent chats to look at. */
  maxChats: number;
  /** How many messages to copy per chat (newest first). */
  maxMessagesPerChat: number;
}

/**
 * Copies new messages into the local store. Only chats with activity newer than what is stored
 * are fetched, so repeated searches stay cheap. Uses GET requests only; nothing is marked read.
 */
export async function syncRecent(
  client: LineOAClient,
  store: MessageStore,
  botId: string,
  limits: SyncLimits,
): Promise<{ chatsChecked: number; chatsUpdated: number }> {
  let cursor: string | undefined;
  let checked = 0;
  let updated = 0;
  while (checked < limits.maxChats) {
    const page = await client.listChats(botId, { limit: 25, ...(cursor ? { cursor } : {}) });
    for (const chat of page.items) {
      if (checked >= limits.maxChats) break;
      checked++;
      const latest = chat.lastMessage?.at;
      if (!latest || store.syncedUpto(botId, chat.chatId) === latest) continue;
      const messages = [];
      let mCursor: string | undefined;
      while (messages.length < limits.maxMessagesPerChat) {
        const mPage = await client.listMessages(botId, chat.chatId, {
          limit: 50,
          ...(mCursor ? { cursor: mCursor } : {}),
        });
        messages.push(...mPage.items);
        if (!mPage.cursor) break;
        mCursor = mPage.cursor;
      }
      store.saveChat(botId, chat.chatId, chat.name, messages, latest);
      updated++;
    }
    if (!page.cursor) break;
    cursor = page.cursor;
  }
  return { chatsChecked: checked, chatsUpdated: updated };
}
