import { randomInt } from "node:crypto";
import type { Config } from "../config.js";
import { LineOAError } from "../domain/errors.js";
import { type RawChat, type RawEvent, toChat, toMessage } from "../domain/normalize.js";
import type { AttachmentRef, Bot, Chat, Me, Message, UserProfile } from "../domain/types.js";
import { getBytes, getJson, postJson } from "./http.js";

export interface Page<T> {
  items: T[];
  cursor?: string;
}

/**
 * The one seam between tools and LINE. Tools never know whether they talk to the mock or the real
 * console: the mock copies the real paths, so one implementation serves both.
 */
export interface LineOAClient {
  me(): Promise<Me>;
  bots(): Promise<Bot[]>;
  listChats(botId: string, opts: { limit: number; cursor?: string }): Promise<Page<Chat>>;
  getChat(botId: string, chatId: string): Promise<Chat>;
  /** Newest first, as LINE returns them. `cursor` pages backward in time. */
  listMessages(
    botId: string,
    chatId: string,
    opts: { limit: number; cursor?: string },
  ): Promise<Page<Message>>;
  /** The chat's profile plus the staff-side tags, notes and assignee. */
  getProfile(botId: string, chatId: string): Promise<UserProfile>;
  /** Downloads one message's image or file. Looks back through the last 5 pages of the chat. */
  getAttachment(
    botId: string,
    chatId: string,
    messageId: string,
  ): Promise<{ ref: AttachmentRef; bytes: Uint8Array; contentType?: string }>;
  /**
   * Sends one text message as the logged-in staff member. Never retries a send whose result is
   * unknown: it looks the sendId up in history instead (SEND_UNCERTAIN if not found).
   */
  sendText(botId: string, chatId: string, text: string): Promise<{ sendId: string; messageId?: string }>;
}

export function createLineClient(cfg: Config, fetchImpl?: typeof fetch): LineOAClient {
  const deps = { baseUrl: cfg.baseUrl, cookie: cfg.cookie, ...(fetchImpl ? { fetch: fetchImpl } : {}) };
  const rawMessages = (botId: string, chatId: string, cursor?: string) =>
    getJson<{ list: RawEvent[]; backward?: string }>(deps, `/api/v3/bots/${botId}/chats/${chatId}/messages`, {
      limit: 50,
      backward: cursor,
    });

  const assertAllowed = (botId: string) => {
    if (cfg.botAllowlist.length && !cfg.botAllowlist.includes(botId)) {
      throw new LineOAError("FORBIDDEN", `OA ${botId} is not in LINEOA_BOT_ALLOWLIST.`);
    }
  };

  return {
    async me() {
      const r = await getJson<{ name?: string; bizId?: string }>(deps, "/api/v1/me");
      return { staffName: r.name ?? "(unknown)", ...(r.bizId ? { bizId: r.bizId } : {}) };
    },

    async bots() {
      const r = await getJson<{
        list: { botId: string; name: string; basicSearchId?: string; userPermissionType?: string }[];
      }>(deps, "/api/v1/bots", { noFilter: "true", limit: 1000 });
      return r.list
        .filter((b) => !cfg.botAllowlist.length || cfg.botAllowlist.includes(b.botId))
        .map((b) => ({
          botId: b.botId,
          name: b.name,
          ...(b.basicSearchId ? { searchId: b.basicSearchId } : {}),
          ...(b.userPermissionType ? { role: b.userPermissionType } : {}),
        }));
    },

    async listChats(botId, { limit, cursor }) {
      assertAllowed(botId);
      // The real console answers 400 for pages over 25, so bigger requests are fetched 25 at a time.
      const items: Chat[] = [];
      let next = cursor;
      do {
        const r = await getJson<{ list: RawChat[]; next?: string }>(deps, `/api/v2/bots/${botId}/chats`, {
          folderType: "ALL",
          limit: Math.min(25, limit - items.length),
          next,
        });
        items.push(...r.list.map((c) => toChat(c, botId, cfg.webBaseUrl)));
        next = r.next;
      } while (next && items.length < limit);
      return { items, ...(next ? { cursor: next } : {}) };
    },

    async getChat(botId, chatId) {
      assertAllowed(botId);
      const r = await getJson<RawChat>(deps, `/api/v1/bots/${botId}/chats/${chatId}`);
      return toChat(r, botId, cfg.webBaseUrl);
    },

    async listMessages(botId, chatId, { limit, cursor }) {
      assertAllowed(botId);
      const r = await getJson<{ list: RawEvent[]; backward?: string }>(
        deps,
        `/api/v3/bots/${botId}/chats/${chatId}/messages`,
        { limit, backward: cursor },
      );
      const items = r.list.map(toMessage).filter((m): m is Message => m !== undefined);
      return { items, ...(r.backward ? { cursor: r.backward } : {}) };
    },

    async getProfile(botId, chatId) {
      assertAllowed(botId);
      const base = `/api/v1/bots/${botId}`;
      const [raw, notes, tags, owners] = await Promise.all([
        getJson<RawChat>(deps, `${base}/chats/${chatId}`),
        getJson<{ list: { body: string; updatedAt?: number; createdAt?: number }[] }>(
          deps,
          `${base}/chats/${chatId}/notes`,
        ),
        getJson<{ list: { tagId: string; name: string }[] }>(deps, `${base}/tags`),
        getJson<{ list: { bizId: string; name: string }[] }>(deps, `${base}/owners`),
      ]);
      const tagName = new Map(tags.list.map((t) => [t.tagId, t.name]));
      const chat = toChat(raw, botId, cfg.webBaseUrl);
      const assignee = owners.list.find((o) => o.bizId === raw.assignedBizId)?.name;
      return {
        userId: raw.profile?.userId ?? chatId,
        chatId,
        botId,
        name: chat.name,
        ...(raw.profile?.nickname ? { nickname: raw.profile.nickname } : {}),
        ...(raw.profile?.friend !== undefined ? { friend: raw.profile.friend } : {}),
        tags: (raw.tagIds ?? []).map((id) => tagName.get(id) ?? id),
        ...(assignee ? { assignee } : {}),
        notes: notes.list.map((n) => ({
          text: n.body,
          at: new Date(n.updatedAt ?? n.createdAt ?? 0).toISOString(),
        })),
        ...(raw.lastTalkedAt ? { lastTalkedAt: new Date(raw.lastTalkedAt).toISOString() } : {}),
        webUrl: chat.webUrl,
      };
    },

    async getAttachment(botId, chatId, messageId) {
      assertAllowed(botId);
      let cursor: string | undefined;
      for (let page = 0; page < 5; page++) {
        const r = await rawMessages(botId, chatId, cursor);
        const ev = r.list.find((e) => e.message?.id === messageId);
        if (ev?.message) {
          const ref = toMessage(ev)?.attachment;
          const m = ev.message;
          if (!ref) throw new LineOAError("NOT_FOUND", `Message ${messageId} has no image or file.`);
          if (ref.expired) throw new LineOAError("ATTACHMENT_EXPIRED", "LINE no longer keeps this file.");
          const hash = m.contentHash ?? m.contentProvider?.contentHash;
          const url =
            ref.provider === "external"
              ? m.contentProvider?.originalContentUrl
              : `${cfg.contentBaseUrl}/bot/${botId}/${hash}`;
          if (!url || (ref.provider === "line" && !hash))
            throw new LineOAError("NOT_FOUND", "LINE gave no download address for this file.");
          return { ref, ...(await getBytes(deps, url, cfg.maxAttachmentBytes)) };
        }
        if (!r.backward) break;
        cursor = r.backward;
      }
      throw new LineOAError(
        "NOT_FOUND",
        `Message ${messageId} is not in the last 250 messages of this chat.`,
      );
    },

    async sendText(botId, chatId, text) {
      assertAllowed(botId);
      const sendId = `${chatId}_${Date.now()}_${randomInt(1e7, 1e8)}`;
      const path = `/api/v1/bots/${botId}/chats/${chatId}/messages/send`;
      const token = async () => (await getJson<{ token: string }>(deps, "/api/v1/csrfToken")).token;
      const findSent = async () => {
        const r = await rawMessages(botId, chatId);
        return r.list.find((e) => (e as { sendId?: string }).sendId === sendId)?.message?.id;
      };

      let status: number;
      try {
        status = (await postJson(deps, path, { id: "", type: "textV2", text, sendId }, await token())).status;
        // An expired CSRF token gives 403: fetch a fresh one and try exactly once more.
        if (status === 403)
          status = (await postJson(deps, path, { id: "", type: "textV2", text, sendId }, await token()))
            .status;
      } catch (err) {
        if (err instanceof LineOAError) throw err;
        status = 0; // network failure: the message may or may not have gone out
      }
      if (status === 403) throw new LineOAError("FORBIDDEN", "This staff account may not send in this chat.");
      if (status === 404) throw new LineOAError("NOT_FOUND", `Chat ${chatId} not found.`);
      if (status >= 200 && status < 300) {
        const messageId = await findSent().catch(() => undefined);
        return { sendId, ...(messageId ? { messageId } : {}) };
      }
      const messageId = await findSent().catch(() => undefined);
      if (messageId) return { sendId, messageId };
      throw new LineOAError(
        "SEND_UNCERTAIN",
        `Not sure the message was sent (sendId ${sendId}). Check the chat before sending again; do not resend blindly.`,
      );
    },
  };
}
