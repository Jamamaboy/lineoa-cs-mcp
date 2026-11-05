import type { AddressInfo } from "node:net";
import { serve } from "@hono/node-server";
import { createMockApp, SESSION_COOKIE } from "./app.js";

export interface RunningMock {
  baseUrl: string;
  cookie: string;
  close: () => Promise<void>;
}

/** Starts the mock on 127.0.0.1. Falls back to a free port if the preferred one is taken. */
export async function startMock(preferredPort = 8787, devSession = "mock-dev-session"): Promise<RunningMock> {
  const fetchApp = createMockApp({ devSession }).fetch;
  const listen = (port: number) =>
    new Promise<ReturnType<typeof serve>>((resolve, reject) => {
      const s = serve({ fetch: fetchApp, hostname: "127.0.0.1", port });
      s.once("listening", () => resolve(s));
      s.once("error", reject);
    });
  let server: ReturnType<typeof serve>;
  try {
    server = await listen(preferredPort);
  } catch {
    server = await listen(0);
  }
  const { port } = server.address() as AddressInfo;
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    cookie: `${SESSION_COOKIE}=${devSession}`,
    close: () => new Promise((r) => server.close(() => r())),
  };
}
