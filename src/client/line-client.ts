import type { Config } from "../config.js";
import { LineOAError } from "../domain/errors.js";
import { type RawChat, type RawEvent, toChat, toMessage } from "../domain/normalize.js";
import type { Bot, Chat, Me, Message } from "../domain/types.js";
import { getJson } from "./http.js";

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
}

export function createLineClient(cfg: Config, fetchImpl?: typeof fetch): LineOAClient {
  const deps = { baseUrl: cfg.baseUrl, cookie: cfg.cookie, ...(fetchImpl ? { fetch: fetchImpl } : {}) };

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
      const r = await getJson<{ list: RawChat[]; next?: string }>(deps, `/api/v2/bots/${botId}/chats`, {
        folderType: "ALL",
        limit,
        next: cursor,
      });
      return {
        items: r.list.map((c) => toChat(c, botId, cfg.webBaseUrl)),
        ...(r.next ? { cursor: r.next } : {}),
      };
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
  };
}
