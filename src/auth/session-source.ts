import { readFileSync } from "node:fs";

/**
 * Where the staff member's LINE session comes from. The server only ever asks "which cookie do I send
 * to this host?", so a new way to log in is one new SessionSource, with no change to the tools.
 *
 * Built in: `env` (LINEOA_COOKIE) and `file` (written by `lineoa login`).
 * Room for later, not built: a web login page that posts the session to a hosted server, a browser
 * extension that hands over the cookie, or a team vault that stores one session per staff member.
 */
export interface SessionSource {
  readonly name: string;
  cookieFor(host: string): string | undefined;
}

/** A raw Cookie header from the environment, used for every host (handy for the mock and CI). */
export function envSource(cookie: string | undefined): SessionSource {
  return { name: "env", cookieFor: () => cookie || undefined };
}

/** A Playwright storageState file; picks the cookies whose domain matches the host. */
export function fileSource(path: string): SessionSource {
  return {
    name: "file",
    cookieFor(host) {
      let raw: string;
      try {
        raw = readFileSync(path, "utf8"); // read every time, so a fresh login needs no restart
      } catch {
        return undefined;
      }
      const state = JSON.parse(raw) as { cookies?: { name: string; value: string; domain: string }[] };
      const cookies = (state.cookies ?? []).filter((c) => host.endsWith(c.domain.replace(/^\./, "")));
      return cookies.length ? cookies.map((c) => `${c.name}=${c.value}`).join("; ") : undefined;
    },
  };
}

/** Asks each source in order and uses the first answer. */
export function firstOf(...sources: SessionSource[]): SessionSource {
  return {
    name: sources.map((s) => s.name).join("+"),
    cookieFor: (host) => sources.map((s) => s.cookieFor(host)).find(Boolean),
  };
}
