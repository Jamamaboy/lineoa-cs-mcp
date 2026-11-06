// Design push — generic reusable plugin.
// One page per topic (msg.pageName). Each push appends a new "vN · date · label"
// block at the bottom of that page's root frame; older blocks are never touched,
// so versions stay side by side for comparison.
//
// Message in from ui.html:
// {
//   type: "push-version",
//   pageName: string,               // Figma page to create/append to
//   version: number,                // vN label
//   date: "YYYY-MM-DD",
//   label: string,                  // short label after the date
//   decisions: string,              // optional free text — "what was picked and why"
//   sectionTitles: { [key]: string }, // optional — nicer titles than the raw section key
//   files: [{ section, screen, part, name, bytes }]  // bytes: Uint8Array of a PNG
// }

const ROOT_NAME = "Versions";

let F = null, FAMILY = null;
async function ensureFonts() {
  if (F) return;
  const fams = await figma.listAvailableFontsAsync();
  const byFam = {};
  for (const f of fams) { const fam = f.fontName.family; if (!byFam[fam]) byFam[fam] = new Set(); byFam[fam].add(f.fontName.style); }
  FAMILY = ["IBM Plex Sans Thai", "Noto Sans Thai", "Sarabun", "Prompt", "Kanit", "Inter", "Roboto"].find(f => byFam[f] && byFam[f].has("Regular") && byFam[f].has("Bold"));
  if (!FAMILY) throw new Error("no usable font found (tried IBM Plex Sans Thai / Noto Sans Thai / Sarabun / Prompt / Kanit / Inter / Roboto)");
  const has = s => byFam[FAMILY].has(s);
  F = {
    r: { family: FAMILY, style: "Regular" },
    b: { family: FAMILY, style: "Bold" },
    s: { family: FAMILY, style: has("SemiBold") ? "SemiBold" : has("Semi Bold") ? "Semi Bold" : "Bold" },
  };
  for (const k of Object.keys(F)) await figma.loadFontAsync(F[k]);
}

// ---------- small node helpers (same shape as the EasyHR mockup-import plugin) ----------
const hex = h => { const n = parseInt(h.slice(1), 16); return { r: (n >> 16 & 255) / 255, g: (n >> 8 & 255) / 255, b: (n & 255) / 255 }; };
const solid = h => [{ type: "SOLID", color: hex(h) }];

function text(str, font, size, color, opts = {}) {
  const t = figma.createText();
  t.fontName = font; t.fontSize = size; t.characters = str; t.fills = solid(color);
  if (opts.lh) t.lineHeight = { unit: "PERCENT", value: opts.lh };
  if (opts.name) t.name = opts.name;
  return t;
}
function add(parent, child, opts = {}) {
  parent.appendChild(child);
  if (opts.fillW) { if (child.type === "TEXT") child.textAutoResize = "HEIGHT"; child.layoutSizingHorizontal = "FILL"; }
  return child;
}
function al(dir, props = {}) {
  const n = figma.createFrame();
  n.layoutMode = dir; n.primaryAxisSizingMode = "AUTO"; n.counterAxisSizingMode = "AUTO";
  n.itemSpacing = props.itemSpacing || 0; if (props.name) n.name = props.name;
  n.fills = props.fill ? solid(props.fill) : [];
  n.clipsContent = false;
  return n;
}
function pad(n, t, r, b, l) { n.paddingTop = t; n.paddingRight = r; n.paddingBottom = b; n.paddingLeft = l; }

async function imgRectFromBytes(bytes, maxWidth, opts = {}) {
  const img = figma.createImage(bytes);
  const size = await img.getSizeAsync();
  const w = Math.min(maxWidth, size.width);
  const h = Math.max(1, Math.round(size.height * (w / size.width)));
  const n = figma.createRectangle();
  n.resize(w, h);
  n.fills = [{ type: "IMAGE", imageHash: img.hash, scaleMode: "FILL" }];
  if (opts.radius) n.cornerRadius = opts.radius;
  if (opts.name) n.name = opts.name;
  return n;
}

// ---------- page / root lookup ----------
async function findOrCreatePage(pageName) {
  await figma.loadAllPagesAsync();
  let page = figma.root.children.find(p => p.name === pageName);
  let created = false;
  if (!page) {
    page = figma.createPage();
    page.name = pageName;
    created = true;
  }
  return { page, created };
}
function findOrCreateRoot(page, pageName) {
  let root = page.findOne(n => n.name === ROOT_NAME && n.type === "FRAME");
  if (!root) {
    root = al("VERTICAL", { name: ROOT_NAME, itemSpacing: 56 });
    pad(root, 48, 48, 64, 48);
    root.fills = solid("#F4F6F9");
    page.appendChild(root);
    add(root, text(pageName, F.b, 30, "#16202B"));
  }
  return root;
}

// ---------- one version block ----------
async function buildVersionBlock(msg) {
  const heading = "v" + msg.version + " · " + msg.date + (msg.label ? " · " + msg.label : "");
  const block = al("VERTICAL", { name: heading, itemSpacing: 20 });
  add(block, text(heading, F.b, 22, "#16202B"));

  if (msg.decisions) {
    const note = al("VERTICAL", { name: "Decisions", itemSpacing: 4 });
    pad(note, 12, 16, 12, 16);
    note.fills = solid("#EEF3F9");
    note.cornerRadius = 10;
    const t = add(note, text(msg.decisions, F.r, 13.5, "#34506F", { lh: 150 }));
    t.textAutoResize = "HEIGHT";
    t.resize(900, t.height);
    add(block, note);
  }

  const bySection = new Map();
  for (const f of msg.files) {
    if (!bySection.has(f.section)) bySection.set(f.section, new Map());
    const byScreen = bySection.get(f.section);
    if (!byScreen.has(f.screen)) byScreen.set(f.screen, []);
    byScreen.get(f.screen).push(f);
  }

  let placed = 0;
  for (const [sectionKey, byScreen] of bySection) {
    const sectionTitle = (msg.sectionTitles && msg.sectionTitles[sectionKey]) || sectionKey;
    const sectionBox = al("VERTICAL", { name: sectionKey, itemSpacing: 12 });
    add(sectionBox, text(sectionTitle, F.s, 16, "#16202B"));
    const row = al("HORIZONTAL", { name: "Screens", itemSpacing: 24 });
    row.counterAxisAlignItems = "MIN";
    for (const [screenKey, parts] of byScreen) {
      parts.sort((a, b) => a.part - b.part);
      const col = al("VERTICAL", { name: screenKey, itemSpacing: 6 });
      add(col, text(screenKey, F.r, 12, "#4B5663"));
      const stack = al("VERTICAL", { name: "Stack", itemSpacing: 0 });
      stack.cornerRadius = 8;
      stack.clipsContent = true;
      stack.effects = [{ type: "DROP_SHADOW", color: { r: 0.06, g: 0.1, b: 0.16, a: 0.12 }, offset: { x: 0, y: 2 }, radius: 10, spread: 0, visible: true, blendMode: "NORMAL" }];
      for (const f of parts) {
        const maxWidth = msg.imageWidth || 360; // cap so the page stays scannable; real aspect ratio is preserved
        const rect = await imgRectFromBytes(f.bytes, maxWidth, { name: f.name + (parts.length > 1 ? " · part " + f.part : "") });
        add(stack, rect);
        placed++;
      }
      add(col, stack);
      add(row, col);
    }
    add(sectionBox, row);
    add(block, sectionBox);
  }
  return { block, placed };
}

async function handle(msg) {
  if (msg.type === "push-version") {
    await ensureFonts();
    const pageName = msg.pageName || "Design imports";
    const { page } = await findOrCreatePage(pageName);
    const root = findOrCreateRoot(page, pageName);
    const { block, placed } = await buildVersionBlock(msg);
    root.appendChild(block);
    await figma.setCurrentPageAsync(page);
    figma.viewport.scrollAndZoomIntoView([block]);
    figma.ui.postMessage({ text: "pushed v" + msg.version + " to “" + pageName + "” — " + placed + " image(s)", done: true });
  } else if (msg.type === "close") {
    figma.closePlugin();
  }
}

figma.showUI(__html__, { width: 360, height: 220 });
let chain = Promise.resolve();
figma.ui.onmessage = msg => {
  chain = chain.then(() => handle(msg)).catch(e => figma.ui.postMessage({ text: "error: " + (e && e.message ? e.message : e), done: true }));
};
