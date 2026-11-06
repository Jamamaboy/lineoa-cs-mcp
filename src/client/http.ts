import { hostMatches } from "../auth/session-source.js";
import { authExpired, LineOAError } from "../domain/errors.js";

const UNREACHABLE = "Could not reach chat.line.biz (network error). Check the connection and retry.";

/** The web app sends this header; linebiz copies it, so do we. */
const CLIENT_VERSION = "20240513144702";

export interface HttpDeps {
  baseUrl: string;
  cookie: (host?: string) => string | undefined;
  fetch?: typeof fetch;
}

/**
 * GET JSON from chat.line.biz's internal API with the staff member's session cookie.
 * Maps every failure to a typed error and never pretends an odd response succeeded.
 */
export async function getJson<T>(
  deps: HttpDeps,
  path: string,
  query: Record<string, string | number | undefined> = {},
): Promise<T> {
  const cookie = deps.cookie();
  if (!cookie) throw authExpired();
  const url = new URL(deps.baseUrl + path);
  for (const [k, v] of Object.entries(query))
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));

  let res: Response;
  try {
    res = await (deps.fetch ?? fetch)(url, {
      headers: {
        Accept: "application/json, text/plain, */*",
        Cookie: cookie,
        "x-oa-chat-client-version": CLIENT_VERSION,
      },
      // A redirect means the console sent us to the login page (account.line.biz).
      redirect: "manual",
    });
  } catch {
    throw new LineOAError("UPSTREAM_ERROR", UNREACHABLE);
  }

  if (res.status >= 300 && res.status < 400) throw authExpired();
  if (res.status === 401) throw authExpired();
  if (res.status === 403)
    throw new LineOAError("FORBIDDEN", "This staff account has no permission for that OA or chat.");
  if (res.status === 404)
    throw new LineOAError(
      "NOT_FOUND",
      "LINE answered 404 (not found). Check the id with list_chats or auth_status.",
    );
  if (res.status === 429) {
    const retry = Number(res.headers.get("retry-after") ?? "30");
    throw new LineOAError("RATE_LIMITED", "LINE is rate limiting; wait and retry.", retry);
  }
  if (!res.ok) throw new LineOAError("UPSTREAM_ERROR", `chat.line.biz answered ${res.status} for ${path}`);

  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("json")) {
    throw new LineOAError(
      "ENDPOINT_CHANGED",
      `Expected JSON from ${path} but got "${type}". The internal API may have changed.`,
    );
  }
  return (await res.json()) as T;
}

/**
 * Downloads attachment bytes. The session cookie goes only to LINE's own hosts (or the mock); a
 * public URL from the sender gets no cookie. Refuses anything over `maxBytes`.
 */
export async function getBytes(
  deps: HttpDeps,
  url: string,
  maxBytes: number,
): Promise<{ bytes: Uint8Array; contentType?: string }> {
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    throw new LineOAError("UPSTREAM_ERROR", "LINE gave a download address that is not a valid URL.");
  }
  // The cookie goes to LINE only over HTTPS (or to the mock's own origin).
  const own =
    (hostMatches(target.hostname, "line.biz") && target.protocol === "https:") ||
    target.origin === new URL(deps.baseUrl).origin;
  const cookie = own ? deps.cookie(target.hostname) : undefined;
  if (own && !cookie) throw authExpired();
  let res: Response;
  try {
    res = await (deps.fetch ?? fetch)(target, { headers: cookie ? { Cookie: cookie } : {} });
  } catch {
    // Host name only: the URL of a public file can carry a signed query.
    throw new LineOAError(
      "UPSTREAM_ERROR",
      own
        ? UNREACHABLE
        : `Could not download the file from ${target.hostname} (network error). Open the chat's webUrl to see it in LINE OA Manager.`,
    );
  }
  if (new URL(res.url || url).hostname.startsWith("account.")) throw authExpired();
  if (res.status === 401) throw authExpired();
  if (res.status === 404 || res.status === 410)
    throw new LineOAError("ATTACHMENT_EXPIRED", "LINE no longer has this file (expired or deleted).");
  if (!res.ok) throw new LineOAError("UPSTREAM_ERROR", `download failed with ${res.status}`);
  const tooBig = () =>
    new LineOAError("ATTACHMENT_TOO_LARGE", `The file is larger than ${Math.round(maxBytes / 1048576)} MB.`);
  if (Number(res.headers.get("content-length") ?? 0) > maxBytes) throw tooBig();
  // Read in chunks and stop at the cap, so a file sent without a length can't fill memory first.
  const chunks: Uint8Array[] = [];
  let size = 0;
  const reader = res.body?.getReader();
  try {
    for (let chunk = await reader?.read(); chunk && !chunk.done; chunk = await reader?.read()) {
      size += chunk.value.length;
      if (size > maxBytes) {
        await reader?.cancel();
        throw tooBig();
      }
      chunks.push(chunk.value);
    }
  } catch (err) {
    if (err instanceof LineOAError) throw err;
    // The connection dropped after the headers: same answer as a failed connect, host name only.
    throw new LineOAError(
      "UPSTREAM_ERROR",
      `The download from ${target.hostname} was cut off. Retry, or open the chat's webUrl.`,
    );
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.length;
  }
  const contentType = res.headers.get("content-type") ?? undefined;
  return { bytes, ...(contentType ? { contentType } : {}) };
}

/** POST JSON with the CSRF header. Returns the HTTP status so the caller can refresh the token on 403. */
export async function postJson(
  deps: HttpDeps,
  path: string,
  body: unknown,
  csrfToken: string,
): Promise<{ status: number }> {
  const cookie = deps.cookie();
  if (!cookie) throw authExpired();
  const res = await (deps.fetch ?? fetch)(new URL(deps.baseUrl + path), {
    method: "POST",
    headers: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json",
      Cookie: cookie,
      "X-XSRF-TOKEN": csrfToken,
      "x-oa-chat-client-version": CLIENT_VERSION,
    },
    body: JSON.stringify(body),
    redirect: "manual",
  });
  if ((res.status >= 300 && res.status < 400) || res.status === 401) throw authExpired();
  await res.body?.cancel();
  return { status: res.status };
}
