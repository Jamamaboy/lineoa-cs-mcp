type Env = NodeJS.ProcessEnv;

/**
 * LINEOA_MOCK=1 starts the built-in mock in this process and points the settings at it, so the MCP server
 * and the CLI both run against fake chats with one setting. Mock data never mixes into the real search
 * index or audit log. Returns the settings to use and a function that stops the mock.
 */
export async function withMockIfAsked(env: Env): Promise<{ env: Env; close: () => Promise<void> }> {
  if (env.LINEOA_MOCK !== "1") return { env, close: async () => {} };
  const { startMock } = await import("../mock-server/start.js");
  const mock = await startMock(Number(env.LINEOA_MOCK_PORT ?? 8787));
  console.error(`mock chat.line.biz running at ${mock.baseUrl} (open it in a browser to see the chats)`);
  return {
    env: {
      ...env,
      LINEOA_BASE_URL: mock.baseUrl,
      LINEOA_COOKIE: mock.cookie,
      // Always in memory: fake chats and fake sends must never reach the real index or audit log.
      LINEOA_INDEX_FILE: ":memory:",
      LINEOA_AUDIT_FILE: ":memory:",
    },
    close: mock.close,
  };
}
