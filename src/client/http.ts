import { authExpired, LineOAError } from "../domain/errors.js";

/** The web app sends this header; linebiz copies it, so do we. */
const CLIENT_VERSION = "20240513144702";

export interface HttpDeps {
  baseUrl: string;
  cookie: () => string | undefined;
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

  const res = await (deps.fetch ?? fetch)(url, {
    headers: {
      Accept: "application/json, text/plain, */*",
      Cookie: cookie,
      "x-oa-chat-client-version": CLIENT_VERSION,
    },
    // A redirect means the console sent us to the login page (account.line.biz).
    redirect: "manual",
  });

  if (res.status >= 300 && res.status < 400) throw authExpired();
  if (res.status === 401) throw authExpired();
  if (res.status === 403)
    throw new LineOAError("FORBIDDEN", "This staff account has no permission for that OA or chat.");
  if (res.status === 404) throw new LineOAError("NOT_FOUND", `Not found: ${path}`);
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
