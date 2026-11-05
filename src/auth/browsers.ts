import { existsSync } from "node:fs";
import { type Browser, chromium, firefox, webkit } from "playwright-core";

/**
 * Browsers the login window can use. Chromium-family browsers already on the computer work with no
 * download. Firefox and WebKit (Safari's engine) need Playwright's own build once:
 * `npx playwright-core install firefox` / `webkit`. The real Safari app cannot be automated.
 */
export const BROWSERS = ["chrome", "edge", "brave", "chromium", "firefox", "webkit"] as const;
export type BrowserName = (typeof BROWSERS)[number];

const BRAVE_PATHS = [
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
  "/usr/bin/brave-browser",
];

async function tryLaunch(name: BrowserName): Promise<Browser | undefined> {
  const headless = false;
  try {
    switch (name) {
      case "chrome":
        return await chromium.launch({ channel: "chrome", headless });
      case "edge":
        return await chromium.launch({ channel: "msedge", headless });
      case "brave": {
        const executablePath = BRAVE_PATHS.find((p) => existsSync(p));
        return executablePath ? await chromium.launch({ executablePath, headless }) : undefined;
      }
      case "chromium":
        return await chromium.launch({ headless });
      case "firefox":
        return await firefox.launch({ headless });
      case "webkit":
        return await webkit.launch({ headless });
    }
  } catch {
    return undefined;
  }
}

/** Opens the requested browser, or the first one that works: Chrome, Edge, Brave, then Chromium. */
export async function openBrowser(wanted?: BrowserName): Promise<{ browser: Browser; name: BrowserName }> {
  const order: BrowserName[] = wanted ? [wanted] : ["chrome", "edge", "brave", "chromium"];
  for (const name of order) {
    const browser = await tryLaunch(name);
    if (browser) return { browser, name };
  }
  const hint =
    wanted === "firefox" || wanted === "webkit" || wanted === "chromium"
      ? `Install it once with: npx playwright-core install ${wanted}`
      : "Install Google Chrome or Microsoft Edge, or run: npx playwright-core install chromium";
  throw new Error(`No browser could be opened${wanted ? ` (${wanted})` : ""}. ${hint}`);
}
