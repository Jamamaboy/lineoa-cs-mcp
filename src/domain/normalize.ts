import type { AttachmentRef, Chat, Message, MessageType, Sender } from "./types.js";

// Raw chat.line.biz JSON (see test/research/line-api-shapes). Only the fields we read are typed.
export interface RawEvent {
  type: string;
  timestamp: number;
  message?: {
    id: string;
    type: string;
    text?: string;
    fileName?: string;
    fileSize?: number;
    duration?: number;
    contentHash?: string;
    expired?: boolean;
    expiredAt?: number;
    contentProvider?: { type?: string; expired?: boolean; expiredAt?: number };
    altText?: string;
    title?: string;
    address?: string;
    packageId?: string;
    stickerId?: string;
  };
}
export interface RawChat {
  chatId: string;
  tagIds?: string[];
  assignedBizId?: string;
  read?: boolean;
  done?: boolean;
  followedUp?: boolean;
  chatType?: string;
  lastTalkedAt?: number;
  profile?: { name?: string; userId?: string; groupId?: string; nickname?: string; friend?: boolean };
  latestEvent?: RawEvent;
}

const iso = (ms: number | undefined) => (ms ? new Date(ms).toISOString() : undefined);

export function webUrl(webBase: string, botId: string, chatId: string): string {
  return `${webBase.replace(/\/$/, "")}/${botId}/chat/${chatId}`;
}

function senderOf(ev: RawEvent): Sender {
  if (ev.type === "message") return "customer";
  if (ev.type === "messageSent") return "staff";
  return "system";
}

const MEDIA = new Set(["image", "video", "audio", "file"]);
const KNOWN: ReadonlySet<string> = new Set([
  "text",
  "image",
  "video",
  "audio",
  "file",
  "sticker",
  "location",
  "flex",
  "unsent",
]);

function attachmentOf(m: NonNullable<RawEvent["message"]>): AttachmentRef | undefined {
  if (!MEDIA.has(m.type)) return undefined;
  const p = m.contentProvider;
  const expiredAt = m.expiredAt ?? p?.expiredAt;
  return {
    kind: m.type as AttachmentRef["kind"],
    provider: p?.type === "external" ? "external" : "line",
    ...(m.fileName ? { fileName: m.fileName } : {}),
    ...(m.fileSize !== undefined ? { sizeBytes: m.fileSize } : {}),
    ...(m.duration !== undefined ? { durationMs: m.duration } : {}),
    ...((m.expired ?? p?.expired) !== undefined ? { expired: Boolean(m.expired ?? p?.expired) } : {}),
    ...(expiredAt ? { expiresAt: iso(expiredAt) } : {}),
  };
}

/** One-line text for list views. Never empty: unknown types get a placeholder instead of being dropped. */
function previewOf(m: NonNullable<RawEvent["message"]>): string {
  switch (m.type) {
    case "text":
      return m.text ?? "";
    case "file":
      return `[file] ${m.fileName ?? ""}`.trim();
    case "flex":
      return `[card] ${m.altText ?? ""}`.trim();
    case "location":
      return `[location] ${m.title ?? m.address ?? ""}`.trim();
    case "unsent":
      return "[message unsent]";
    default:
      return `[${m.type}]`;
  }
}

export function toMessage(ev: RawEvent): Message | undefined {
  const m = ev.message;
  const sentAt = iso(ev.timestamp) ?? new Date(0).toISOString();
  if (!m) {
    return { id: `${ev.type}-${ev.timestamp}`, sentAt, from: "system", type: "unknown", event: ev.type };
  }
  const type: MessageType = KNOWN.has(m.type) ? (m.type as MessageType) : "unknown";
  const attachment = attachmentOf(m);
  const text = m.type === "text" ? m.text : previewOf(m);
  return {
    id: m.id,
    sentAt,
    from: senderOf(ev),
    type,
    ...(text ? { text } : {}),
    ...(attachment ? { attachment } : {}),
  };
}

export function toChat(raw: RawChat, botId: string, webBase: string): Chat {
  const kind = raw.chatType === "GROUP" ? "group" : raw.chatType === "ROOM" ? "room" : "user";
  const last = raw.latestEvent;
  const lastMsg = last?.message
    ? { at: iso(last.timestamp) ?? "", from: senderOf(last), preview: previewOf(last.message) }
    : undefined;
  return {
    chatId: raw.chatId,
    botId,
    kind,
    name: raw.profile?.name ?? "(no name)",
    ...(raw.profile?.userId ? { userId: raw.profile.userId } : {}),
    status: raw.done ? "done" : "ongoing",
    unread: raw.read === false,
    followUp: Boolean(raw.followedUp),
    ...(lastMsg ? { lastMessage: lastMsg } : {}),
    webUrl: webUrl(webBase, botId, raw.chatId),
  };
}
