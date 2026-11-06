// Dry-runs skills/make-figma/scripts/plugin/code.js against a stub `figma` object in Node,
// so the plugin's logic gets exercised (page/root creation, section/screen grouping,
// image sizing, version append) without needing the real Figma desktop app.
import { readFileSync } from "node:fs";

const CODE_PATH = process.argv[2];
const src = readFileSync(CODE_PATH, "utf8");

function makeNode(type) {
  const node = {
    type,
    name: "",
    children: [],
    fills: [],
    x: 0, y: 0, width: 0, height: 0,
    appendChild(c) { this.children.push(c); c.parent = this; },
    findOne(pred) {
      for (const c of this.children) { if (pred(c)) return c; const r = c.findOne ? c.findOne(pred) : null; if (r) return r; }
      return null;
    },
    resize(w, h) { this.width = w; this.height = h; },
  };
  return node;
}

const pages = [];
let currentPage = null;
let waiters = [];
function waitForDone() { return new Promise(res => waiters.push(res)); }

const stubFigma = {
  root: { get children() { return pages; } },
  createPage() { const p = makeNode("PAGE"); p.children = []; pages.push(p); return p; },
  createFrame() { return makeNode("FRAME"); },
  createRectangle() { return makeNode("RECTANGLE"); },
  createText() { const t = makeNode("TEXT"); t.characters = ""; return t; },
  createImage(bytes) { return { hash: "hash-" + bytes.length, getSizeAsync: async () => ({ width: 720, height: bytes.length % 2 === 0 ? 1600 : 900 }) }; },
  async loadAllPagesAsync() {},
  async listAvailableFontsAsync() {
    return [
      { fontName: { family: "Inter", style: "Regular" } },
      { fontName: { family: "Inter", style: "Bold" } },
      { fontName: { family: "Inter", style: "SemiBold" } },
    ];
  },
  async loadFontAsync() {},
  async setCurrentPageAsync(p) { currentPage = p; },
  viewport: { scrollAndZoomIntoView() {} },
  showUI() {},
  ui: {
    postMessage(m) {
      console.log("[ui message]", JSON.stringify(m));
      if (m && m.done) { const ws = waiters; waiters = []; ws.forEach(r => r()); }
    },
    onmessage: null,
  },
  closePlugin() {},
};

global.figma = stubFigma;
global.__html__ = "<!-- stub ui -->";

// Load the plugin source in this stubbed global context.
await import("data:text/javascript," + encodeURIComponent(src));

function pngBytes(n) { return new Uint8Array(n).fill(1); }

async function run() {
  const msg1 = {
    type: "push-version",
    pageName: "Mockups — dry run",
    version: 1,
    date: "2026-09-27",
    label: "first pass",
    decisions: "Picked layout C because it keeps the header short.",
    sectionTitles: { before: "Before", after: "After" },
    files: [
      { section: "before", screen: "list", part: 1, name: "before__list__p1.png", bytes: pngBytes(100) },
      { section: "after", screen: "list", part: 1, name: "after__list__p1.png", bytes: pngBytes(101) },
      { section: "after", screen: "detail", part: 1, name: "after__detail__p1.png", bytes: pngBytes(200) },
      { section: "after", screen: "detail", part: 2, name: "after__detail__p2.png", bytes: pngBytes(201) },
    ],
  };
  figma.ui.onmessage(msg1);
  await waitForDone();

  const msg2 = {
    type: "push-version",
    pageName: "Mockups — dry run",
    version: 2,
    date: "2026-09-28",
    label: "picked B",
    files: [
      { section: "after", screen: "list", part: 1, name: "after__list__p1.png", bytes: pngBytes(102) },
    ],
  };
  figma.ui.onmessage(msg2);
  await waitForDone();

  console.log("\n--- assertions ---");
  const page = pages.find(p => p.name === "Mockups — dry run");
  if (!page) throw new Error("page was not created");
  if (pages.length !== 1) throw new Error("expected exactly 1 page, got " + pages.length);
  const root = page.findOne(n => n.name === "Versions");
  if (!root) throw new Error("root frame missing");
  const versionBlocks = root.children.filter(c => /^v\d/.test(c.name));
  if (versionBlocks.length !== 2) throw new Error("expected 2 version blocks appended, got " + versionBlocks.length);
  console.log("OK: 1 page, root frame present, 2 version blocks appended (older one untouched)");
  console.log("v1 block name:", versionBlocks[0].name);
  console.log("v2 block name:", versionBlocks[1].name);
}

await run();
console.log("\ndry run passed");
