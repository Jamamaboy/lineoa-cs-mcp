import { startMock } from "./start.js";

// 127.0.0.1 only: whatsapp-mcp's bridge listened on every interface with no auth; we don't repeat that.
const mock = await startMock(Number(process.env.MOCK_PORT ?? 8787), process.env.MOCK_DEV_SESSION);
console.log(`mock chat.line.biz on ${mock.baseUrl}  (open it in a browser)`);
console.log(`dev session cookie: ${mock.cookie}`);
