#!/usr/bin/env python3
"""Build test/research/index.html from test/research/data/*.json.

Usage:  python3 -I test/research/tools/build.py test/research
Everything visual (diagrams, charts, score table) is generated here from the agents' JSON,
so every project gets the same layout. No CDN; the page opens from file://.
"""
import html
import json
import math
import sys
from datetime import date
from pathlib import Path

ROOT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

CATEGORIES = [
    ("line-internal-api", "LINE OA: client ที่ยิง internal API", "endpoint + cookie / CSRF"),
    ("line-browser-ext", "LINE OA: extension / script ใน browser", "polling + URL ไฟล์ที่ใช้ cookie"),
    ("chat-mcp-unofficial", "MCP ที่ใช้ session ของผู้ใช้จริง", "identity guard · ปิดการส่งไว้ก่อน · media เมื่อขอ"),
    ("mcp-official", "MCP ทางการ / ของผลิตภัณฑ์", "รูปแบบ tool + annotation"),
    ("inbox-oss", "ระบบรวมแชทแบบโอเพนซอร์ส", "domain model"),
    ("inbox-saas", "ระบบรวมแชทแบบ SaaS", "UX: สลิป · placeholder · ร่างก่อนส่ง"),
]
CAT_LABEL = {k: v for k, v, _ in CATEGORIES}

CRITERIA = [  # key, Thai label, weight
    ("relevance", "ตรงโจทย์", 30),
    ("auth", "Auth", 20),
    ("attachments", "ไฟล์แนบ", 15),
    ("maturity", "ความพร้อม", 15),
    ("popularity", "ความนิยม", 10),
    ("tryability", "ลองได้จริง", 10),
]
ACTOR_TH = {"user": "ผู้ใช้", "agent": "agent", "tool": "tool", "service": "service",
            "storage": "storage", "browser": "browser"}
TRIAL_PILL = {"ran": ("ok", "รันได้จริง"), "partial": ("warn", "รันได้บางส่วน"), "not-run": ("mute", "ไม่ได้รัน")}

esc = html.escape


def short_name(p):
    """'owner/repo' -> 'repo'; 'Product (@scope/pkg)' -> 'Product'."""
    n = p["name"]
    if " (" in n:
        return n.split(" (")[0]
    return n.split("/")[-1]


def popularity(stars):
    if stars is None:
        return None
    for limit, score in ((10, 1), (100, 2), (1000, 3), (10000, 4)):
        if stars < limit:
            return score
    return 5


def total_score(p):
    """Weighted 0-100. Missing popularity (no repo) -> its weight is redistributed."""
    num = den = 0.0
    for key, _, w in CRITERIA:
        v = p["_pop"] if key == "popularity" else p["scores"].get(key)
        if v is None:
            continue
        num += w * (v - 1) / 4
        den += w
    return round(100 * num / den) if den else 0


def load():
    items = []
    for f in sorted(DATA.glob("*.json")):
        p = json.loads(f.read_text(encoding="utf-8"))
        gh = p.get("github") or None
        p["_stars"] = gh.get("stars") if gh else None
        p["_pop"] = popularity(p["_stars"])
        p["_total"] = total_score(p)
        items.append(p)
    items.sort(key=lambda p: (-p["_total"], p["slug"]))
    return items


THAI_MARKS = set(chr(c) for c in [0x0E31, *range(0x0E34, 0x0E3B), *range(0x0E47, 0x0E4F)])


def vlen(t):
    """Visible length: Thai above/below marks take no horizontal space."""
    return sum(1 for ch in t if ch not in THAI_MARKS)


def cut(word, width):
    """Index to split `word` so the head has `width` visible chars, never before a combining mark."""
    n = i = 0
    while i < len(word) and n < width:
        if word[i] not in THAI_MARKS:
            n += 1
        i += 1
    while i < len(word) and word[i] in THAI_MARKS:
        i += 1
    return i


def wrap(text, width):
    """Wrap on spaces; hard-split long tokens (Thai has no spaces) without orphaning marks."""
    out, line = [], ""
    for word in str(text).split(" "):
        while vlen(word) > width:
            if line:
                out.append(line)
                line = ""
            k = cut(word, width)
            out.append(word[:k])
            word = word[k:]
        cand = (line + " " + word).strip()
        if vlen(cand) <= width:
            line = cand
        else:
            out.append(line)
            line = word
    if line:
        out.append(line)
    return out


def tspans(lines, x, y0, dy, cls="", anchor="middle"):
    c = f' class="{cls}"' if cls else ""
    return "".join(f'<text{c} x="{x}" y="{y0 + i * dy}" text-anchor="{anchor}">{esc(l)}</text>'
                   for i, l in enumerate(lines))


# ---------------------------------------------------------------- diagrams
def hub_svg(p):
    feats = p.get("core_features", [])[:8]
    n = len(feats)
    rows = math.ceil(n / 2) or 1
    rh, bw, bh = 70, 300, 58
    H = max(rows * rh + 20, 150)
    cx, cy = 450, H / 2
    parts = [f'<svg viewBox="0 0 900 {H}" role="img" aria-label="core features of {esc(p["name"])}">']
    for i, f in enumerate(feats):
        left = i % 2 == 0
        r = i // 2
        y = 10 + r * rh + (rh - bh) / 2 + (H - 20 - rows * rh) / 2
        x = 10 if left else 590
        ex = x + bw if left else x
        ey = y + bh / 2
        sx = cx - 110 if left else cx + 110
        mx = (sx + ex) / 2
        parts.append(f'<path class="rel" d="M{sx},{cy} C{mx},{cy} {mx},{ey} {ex},{ey}"/>')
        parts.append(f'<rect class="bx" x="{x}" y="{y}" width="{bw}" height="{bh}" rx="9"/>')
        parts.append(f'<text class="b" x="{x + 14}" y="{y + 21}">{esc(f.get("name", ""))[:40]}</text>')
        full = wrap(f.get("detail_th", ""), 36)
        lines = full[:2]
        if len(full) > 2:
            lines[-1] = lines[-1][:cut(lines[-1], 34)] + "…"
        parts.append(tspans(lines, x + 14, y + 39, 15, "t2", "start"))
    parts.append(f'<rect class="bx acc" x="{cx - 110}" y="{cy - 32}" width="220" height="64" rx="12"/>')
    name = short_name(p)
    parts.append(f'<text class="b" x="{cx}" y="{cy - 6}" text-anchor="middle">{esc(name)[:30]}</text>')
    parts.append(f'<text class="t2" x="{cx}" y="{cy + 14}" text-anchor="middle">core features · {n}</text>')
    parts.append("</svg>")
    return "".join(parts)


def flow_svg(p):
    steps = p.get("flow", [])[:7]
    n = len(steps) or 1
    gap = 30
    bw = (880 - (n - 1) * gap) / n
    chars = max(7, int(bw / 7.8))
    lines_all = [wrap(s.get("label", ""), chars)[:3] for s in steps]
    bh = 34 + 16 * max((len(l) for l in lines_all), default=1)
    H = bh + 40
    parts = [f'<svg viewBox="0 0 900 {H}" role="img" aria-label="main flow of {esc(p["name"])}">']
    for i, s in enumerate(steps):
        x = 10 + i * (bw + gap)
        actor = s.get("actor", "tool")
        cls = {"agent": "acc", "tool": "acc", "service": "warn", "storage": "mute",
               "user": "", "browser": ""}.get(actor, "")
        parts.append(f'<text class="m" x="{x + bw / 2}" y="16" text-anchor="middle">'
                     f'{i + 1} · {esc(ACTOR_TH.get(actor, actor))}</text>')
        parts.append(f'<rect class="bx {cls}" x="{x}" y="26" width="{bw}" height="{bh}" rx="9"/>')
        ls = lines_all[i]
        y0 = 26 + bh / 2 - (len(ls) - 1) * 8 + 4
        parts.append(tspans(ls, x + bw / 2, y0, 16))
        if i < n - 1:
            ax = x + bw
            parts.append(f'<line class="ln" x1="{ax + 3}" y1="{26 + bh / 2}" x2="{ax + gap - 3}" y2="{26 + bh / 2}"/>')
    parts.append("</svg>")
    return "".join(parts)


def landscape_svg(items):
    by = {k: [p for p in items if p.get("category") == k] for k, _, _ in CATEGORIES}
    lane_h, top = 64, 10
    H = top + lane_h * len(CATEGORIES) + 10
    parts = [f'<svg viewBox="0 0 1000 {H}" role="img" aria-label="landscape">']
    hub_x, hub_y, hub_w, hub_h = 790, H / 2 - 70, 200, 140
    for i, (k, label, borrow) in enumerate(CATEGORIES):
        y = top + i * lane_h
        parts.append(f'<rect class="lane" x="10" y="{y + 4}" width="560" height="{lane_h - 8}" rx="10"/>')
        parts.append(f'<text class="t2 b" x="24" y="{y + 24}">{esc(label)}</text>')
        cx = 24
        for p in by[k]:
            nm = short_name(p)
            w = 16 + 7.2 * len(nm)
            if cx + w > 560:
                break
            parts.append(f'<a href="#p-{esc(p["slug"])}"><rect class="chip" x="{cx}" y="{y + 32}" width="{w}" height="22" rx="11"/>'
                         f'<text class="m" x="{cx + w / 2}" y="{y + 47}" text-anchor="middle">{esc(nm)}</text></a>')
            cx += w + 8
        ey = hub_y + 20 + i * (hub_h - 40) / (len(CATEGORIES) - 1)
        parts.append(f'<path class="ln" d="M570,{y + lane_h / 2} C680,{y + lane_h / 2} 680,{ey} {hub_x - 2},{ey}"/>')
        parts.append(f'<text class="t2" x="556" y="{y + 24}" text-anchor="end" style="fill:var(--accent-ink)">{esc(borrow)}</text>')
    parts.append(f'<rect class="bx acc" x="{hub_x}" y="{hub_y}" width="{hub_w}" height="{hub_h}" rx="14"/>')
    parts.append(f'<text class="b" x="{hub_x + hub_w / 2}" y="{hub_y + 62}" text-anchor="middle">lineoa-mcp</text>')
    parts.append(f'<text class="t2" x="{hub_x + hub_w / 2}" y="{hub_y + 82}" text-anchor="middle">MCP server ของเรา</text>')
    parts.append("</svg>")
    return "".join(parts)


def stars_svg(items):
    rows = [p for p in items if p["_stars"] is not None]
    rows.sort(key=lambda p: -p["_stars"])
    if not rows:
        return "<p class='dim'>ไม่มีข้อมูล stars</p>"
    rh, left, right = 26, 230, 860
    H = 30 + rh * len(rows) + 30
    vmax = max(5, max(p["_stars"] for p in rows))
    top_dec = math.ceil(math.log10(vmax + 1))
    def sx(v):
        return left + (right - left) * math.log10(v + 1) / top_dec
    parts = [f'<svg viewBox="0 0 900 {H}" role="img" aria-label="GitHub stars, log scale">']
    for d in range(0, top_dec + 1):
        v = 10 ** d
        x = left + (right - left) * math.log10(v + 1) / top_dec if d else left
        parts.append(f'<line class="grid" x1="{x}" y1="20" x2="{x}" y2="{H - 28}"/>')
        lab = "0" if d == 0 else (f"{v // 1000}k" if v >= 1000 else str(v))
        parts.append(f'<text class="t2" x="{x}" y="{H - 10}" text-anchor="middle">{lab}</text>')
    for i, p in enumerate(rows):
        y = 26 + i * rh
        w = max(2, sx(p["_stars"]) - left)
        nm = short_name(p)
        parts.append(f'<text class="t2" x="{left - 10}" y="{y + 13}" text-anchor="end">{esc(nm)}</text>')
        tip = f'{p["name"]}: {p["_stars"]:,} stars · fork {p["github"].get("forks", 0):,} · push ล่าสุด {p["github"].get("last_push", "")[:10]}'
        parts.append(f'<g class="hit" data-tip="{esc(tip)}"><rect class="hitbox" x="{left}" y="{y}" width="{right - left}" height="{rh - 4}"/>'
                     f'<path class="barfill" d="M{left},{y + 4} h{max(0, w - 4)} a4,4 0 0 1 4,4 v6 a4,4 0 0 1 -4,4 h-{max(0, w - 4)} z"/></g>')
        if i < 3:
            parts.append(f'<text class="vlab" x="{left + w + 8}" y="{y + 15}">{p["_stars"]:,}</text>')
    parts.append("</svg>")
    return "".join(parts)


def score_cell(v):
    if v is None:
        return '<td class="sc na" data-tip="ไม่มี repo บน GitHub">—</td>'
    return f'<td class="sc s{v}">{v}</td>'


def scoreboard(items):
    head = "".join(f"<th class='c'>{esc(lbl)}<br><span class='dim'>{w}%</span></th>" for _, lbl, w in CRITERIA)
    rows = []
    for rank, p in enumerate(items, 1):
        cells = []
        for key, _, _ in CRITERIA:
            v = p["_pop"] if key == "popularity" else p["scores"].get(key)
            cells.append(score_cell(v))
        t = p["_total"]
        rows.append(
            f"<tr><td class='dim'>{rank}</td><td><a href='#p-{esc(p['slug'])}'>{esc(p['name'])}</a>"
            f"<div class='dim small'>{esc(CAT_LABEL.get(p.get('category'), p.get('category', '')))}</div></td>"
            + "".join(cells)
            + f"<td class='tot'><div class='tbar'><span style='width:{t}%'></span></div><b>{t}</b></td></tr>")
    return (f"<table class='board'><thead><tr><th>#</th><th>โปรเจกต์</th>{head}<th>รวม (0-100)</th></tr></thead>"
            f"<tbody>{''.join(rows)}</tbody></table>")


# ---------------------------------------------------------------- per project
def project_section(p):
    gh = p.get("github")
    meta = []
    if p.get("language"):
        meta.append(esc(p["language"]))
    if p.get("license"):
        meta.append(esc(str(p["license"])))
    if gh:
        meta.append(f"★ {gh.get('stars', 0):,}")
        meta.append(f"fork {gh.get('forks', 0):,}")
        meta.append(f"push ล่าสุด {esc(str(gh.get('last_push', ''))[:10])}")
    uc = p.get("users_claim")
    if uc:
        meta.append(f"ผู้ใช้ (ตามที่บริษัทอ้าง): {esc(uc.get('text', ''))}")
    tr = p.get("trial", {})
    pill_cls, pill_txt = TRIAL_PILL.get(tr.get("status"), ("mute", tr.get("status", "")))
    shots = "".join(
        f"<figure class='shot'><a href='{esc(s['file'])}' class='lb'><img src='{esc(s['file'])}' loading='lazy' alt='{esc(s.get('caption_th', ''))}'></a>"
        f"<figcaption><span class='pill {'ok' if s.get('kind') == 'real-run' else 'mute'}'>{esc(s.get('kind', ''))}</span> {esc(s.get('caption_th', ''))}</figcaption></figure>"
        for s in p.get("screenshots", []))
    sc = p.get("scores", {})
    reasons = sc.get("reasons_th", {})
    score_rows = ""
    for key, lbl, w in CRITERIA:
        v = p["_pop"] if key == "popularity" else sc.get(key)
        why = (f"คำนวณจาก stars ({p['_stars']:,})" if key == "popularity" and v is not None
               else "ไม่มี repo น้ำหนักถูกกระจายให้เกณฑ์อื่น" if key == "popularity"
               else reasons.get(key, ""))
        width = 0 if v is None else v * 20
        score_rows += (f"<div class='srow'><span class='slab'>{esc(lbl)}</span>"
                       f"<span class='strack'><span class='sfill' style='width:{width}%'></span></span>"
                       f"<b>{'—' if v is None else v}</b><span class='why'>{esc(why)}</span></div>")
    tools = p.get("tools_or_endpoints", [])
    tools_html = ("<div class='tools'>" + "".join(f"<code>{esc(t)}</code>" for t in tools[:40]) + "</div>") if tools else "<p class='dim'>ไม่มี</p>"
    li = lambda xs: "".join(f"<li>{esc(x)}</li>" for x in xs)
    sources = "".join(f"<li><a href='{esc(u)}'>{esc(u)}</a></li>" for u in p.get("sources", []))
    return f"""
<section class="proj" id="p-{esc(p['slug'])}">
  <div class="phead">
    <div>
      <div class="dim small">{esc(CAT_LABEL.get(p.get('category'), ''))}</div>
      <h3><a href="{esc(p.get('url', '#'))}">{esc(p['name'])}</a></h3>
      <p class="one">{esc(p.get('one_liner_th', ''))}</p>
      <p class="meta">{' · '.join(meta)}</p>
    </div>
    <div class="big"><b>{p['_total']}</b><span>คะแนนรวม</span><span class="pill {pill_cls}">{pill_txt}</span></div>
  </div>
  <div class="shots">{shots or "<p class='dim'>ไม่มีภาพ</p>"}</div>
  <h4>Core features</h4>
  <figure class="d"><div class="scroll">{hub_svg(p)}</div></figure>
  <h4>Flow หลัก</h4>
  <figure class="d"><div class="scroll">{flow_svg(p)}</div></figure>
  <div class="two">
    <div class="box"><h5>Auth</h5><p>{esc(p.get('auth', {}).get('method_th', ''))}</p>
      <p class="dim small">เก็บที่: {esc(p.get('auth', {}).get('storage_th', ''))}</p>
      <p class="borrow">เอามาใช้: {esc(p.get('auth', {}).get('borrow_th', ''))}</p></div>
    <div class="box"><h5>ไฟล์แนบ</h5><p>{esc(p.get('attachments', {}).get('how_th', ''))}</p>
      <p class="borrow">เอามาใช้: {esc(p.get('attachments', {}).get('borrow_th', ''))}</p></div>
  </div>
  <div class="two">
    <div class="box good"><h5>จุดเด่น</h5><ul>{li(p.get('highlights_th', []))}</ul></div>
    <div class="box weak"><h5>จุดอ่อน</h5><ul>{li(p.get('weaknesses_th', []))}</ul></div>
  </div>
  <h4>ผลการลองใช้ <span class="pill {pill_cls}">{pill_txt}</span></h4>
  <p>{esc(tr.get('summary_th', ''))} <a href="{esc(tr.get('log', '#'))}">ดู log คำสั่งและผลลัพธ์จริง</a></p>
  <h4>Tool / endpoint ที่พบ</h4>{tools_html}
  <h4>คะแนน</h4><div class="scores">{score_rows}</div>
  <details><summary>แหล่งอ้างอิง ({len(p.get('sources', []))})</summary><ul class="src">{sources}</ul></details>
</section>"""


CSS = """
:root{--ground:#F7F8FA;--surface:#FFFFFF;--surface-2:#F1F4F9;--line:#E2E7F0;--line-soft:#EDF1F7;
--ink:#141A22;--ink-2:#4A5568;--ink-3:#8A94A6;--accent:#2563EB;--accent-soft:#E8EFFE;--accent-ink:#1D4ED8;
--ok:#15803D;--ok-soft:#E6F4EA;--warn:#B45309;--warn-soft:#FDF0DC;--crit:#B91C1C;--crit-soft:#FBE9E9;
--bar:#2a78d6;--s1:#86b6ef;--s2:#5598e7;--s3:#2a78d6;--s4:#1c5cab;--s5:#104281;--s-ink-lo:#0b0b0b;--s-ink-hi:#ffffff;
--mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;--sans:system-ui,-apple-system,"Segoe UI","Noto Sans Thai","Sarabun",sans-serif;
--r:10px;--r-lg:14px;--shadow:0 1px 2px rgba(20,26,34,.06),0 1px 3px rgba(20,26,34,.04)}
@media (prefers-color-scheme:dark){:root{--ground:#0E1218;--surface:#161C24;--surface-2:#1D242E;--line:#2A323D;--line-soft:#232A34;
--ink:#EDF1F6;--ink-2:#A8B3C2;--ink-3:#6D7889;--accent:#5B8DEF;--accent-soft:#1B2740;--accent-ink:#8FB2F5;
--ok:#4ADE80;--ok-soft:#16281D;--warn:#FBBF24;--warn-soft:#2C2313;--crit:#F87171;--crit-soft:#2E1717;
--bar:#3987e5;--s1:#184f95;--s2:#256abf;--s3:#3987e5;--s4:#6da7ec;--s5:#9ec5f4;--s-ink-lo:#ffffff;--s-ink-hi:#0b0b0b;--shadow:0 1px 2px rgba(0,0,0,.4)}}
*{box-sizing:border-box}body{margin:0;background:var(--ground);color:var(--ink);font-family:var(--sans);font-size:15px;line-height:1.65}
a{color:var(--accent-ink)}h1,h2,h3,h4,h5{margin:0;line-height:1.3}p{margin:0}
.wrap{max-width:1080px;margin:0 auto;padding:28px 20px 90px}
h1{font-size:26px}.sub{color:var(--ink-2);font-size:14px;margin-top:6px;max-width:80ch}
h2{font-size:20px;margin:42px 0 6px;scroll-margin-top:60px}.lede{color:var(--ink-2);font-size:14px;margin-bottom:14px}
h4{font-size:14.5px;margin:20px 0 8px}h5{font-size:13.5px;margin-bottom:6px}
.small{font-size:12.5px}.dim{color:var(--ink-3)}code{font-family:var(--mono);font-size:.88em;background:var(--surface-2);padding:1px 5px;border-radius:4px}
.nav{position:sticky;top:0;z-index:9;background:var(--ground);border-bottom:1px solid var(--line);padding:8px 0;margin:16px 0 20px;
display:flex;flex-wrap:wrap;gap:4px;font-size:12.5px}.nav a{color:var(--ink-2);text-decoration:none;padding:2px 8px;border-radius:6px}
.nav a:hover{background:var(--surface-2)}
.bar{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));margin:18px 0 6px}
.stat{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:11px 14px}
.stat b{display:block;font-size:22px;letter-spacing:-.01em}.stat span{font-size:12.5px;color:var(--ink-2)}
.card{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);box-shadow:var(--shadow);padding:14px 16px;margin-bottom:12px}
.pill{display:inline-flex;font-size:11.5px;font-weight:600;padding:2px 9px;border-radius:99px;white-space:nowrap;vertical-align:middle}
.pill.ok{background:var(--ok-soft);color:var(--ok)}.pill.warn{background:var(--warn-soft);color:var(--warn)}
.pill.mute{background:var(--surface-2);color:var(--ink-3)}.pill.crit{background:var(--crit-soft);color:var(--crit)}
.scroll{overflow-x:auto}
table{border-collapse:collapse;width:100%}th{text-align:left;font-size:11.5px;color:var(--ink-3);font-weight:600;padding:0 8px 8px;border-bottom:1px solid var(--line)}
td{padding:8px;border-bottom:1px solid var(--line-soft);font-size:13.5px;vertical-align:middle}th.c{text-align:center}
.board td.sc{text-align:center;font-weight:650;width:64px;border-bottom:2px solid var(--surface);border-left:2px solid var(--surface)}
.sc.s1{background:var(--s1);color:var(--s-ink-lo)}.sc.s2{background:var(--s2);color:var(--s-ink-hi)}.sc.s3{background:var(--s3);color:var(--s-ink-hi)}
.sc.s4{background:var(--s4);color:var(--s-ink-hi)}.sc.s5{background:var(--s5);color:var(--s-ink-hi)}.sc.na{color:var(--ink-3);background:var(--surface-2)}
@media (prefers-color-scheme:dark){.sc.s2,.sc.s3{color:#ffffff}.sc.s4,.sc.s5{color:#0b0b0b}}
.tot{min-width:150px}.tot b{margin-left:8px}.tbar{display:inline-block;width:100px;height:8px;background:var(--surface-2);border-radius:4px;vertical-align:middle;overflow:hidden}
.tbar span{display:block;height:100%;background:var(--bar);border-radius:4px}
figure.d{margin:0 0 12px;background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);padding:12px;box-shadow:var(--shadow)}
figure.d svg{width:100%;height:auto;display:block;min-width:720px}figure.d figcaption{font-size:12.5px;color:var(--ink-3);margin-top:8px}
.d text,svg text{fill:var(--ink);font-family:var(--sans);font-size:13px}svg text.b{font-weight:650}svg text.t2{fill:var(--ink-2);font-size:11.5px}
svg text.m{font-family:var(--mono);font-size:11px;fill:var(--ink-2)}svg text.vlab{font-size:12px;fill:var(--ink)}
svg text.lbl{paint-order:stroke;stroke:var(--surface);stroke-width:4px}
svg .bx{fill:var(--surface);stroke:var(--line);stroke-width:1.3}svg .bx.acc{fill:var(--accent-soft);stroke:var(--accent)}
svg .bx.warn{fill:var(--warn-soft);stroke:var(--warn)}svg .bx.mute{fill:var(--surface-2);stroke:var(--line)}
svg .lane{fill:var(--surface-2);stroke:none}svg .chip{fill:var(--surface);stroke:var(--line)}svg a:hover .chip{stroke:var(--accent)}
svg .rel{stroke:var(--ink-3);stroke-width:1.3;fill:none}svg .ln{stroke:var(--ink-3);stroke-width:1.4;fill:none;marker-end:url(#ah)}
svg .grid{stroke:var(--line-soft);stroke-width:1}svg .barfill{fill:var(--bar)}svg .hitbox{fill:transparent}svg .hit:hover .barfill{opacity:.8}
#ah path{fill:var(--ink-3)}
.proj{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);box-shadow:var(--shadow);padding:18px 18px 14px;margin:18px 0;scroll-margin-top:56px}
.phead{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.phead h3{font-size:19px;margin:2px 0 4px}
.one{color:var(--ink-2)}.meta{font-size:12.5px;color:var(--ink-3);margin-top:4px}
.big{text-align:center;min-width:110px;display:flex;flex-direction:column;align-items:center;gap:3px}.big b{font-size:34px;line-height:1}.big span{font-size:12px;color:var(--ink-3)}
.shots{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px;margin-top:14px}
.shot{margin:0}.shot img{width:100%;height:170px;object-fit:cover;object-position:top;border:1px solid var(--line);border-radius:8px;display:block}
.shot figcaption{font-size:12px;color:var(--ink-2);margin-top:4px}
.two{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}@media (max-width:760px){.two{grid-template-columns:1fr}}
.box{background:var(--surface-2);border-radius:var(--r);padding:12px 14px;font-size:13.5px}.box ul{margin:0;padding-left:18px}
.box.good{border-left:3px solid var(--ok)}.box.weak{border-left:3px solid var(--warn)}
.borrow{margin-top:8px;color:var(--accent-ink);font-size:13px}
.tools{display:flex;flex-wrap:wrap;gap:6px}
.scores{display:flex;flex-direction:column;gap:6px}.srow{display:grid;grid-template-columns:90px 160px 24px 1fr;gap:10px;align-items:center;font-size:13px}
.strack{height:8px;background:var(--surface-2);border-radius:4px;overflow:hidden}.sfill{display:block;height:100%;background:var(--bar);border-radius:4px}
.why{color:var(--ink-2);font-size:12.5px}
details{margin-top:12px;font-size:13px}.src{font-size:12px;word-break:break-all}
#tip{position:fixed;pointer-events:none;background:var(--ink);color:var(--surface);font-size:12px;padding:6px 9px;border-radius:6px;opacity:0;transition:opacity .1s;z-index:20;max-width:320px}
#lb{position:fixed;inset:0;background:rgba(0,0,0,.8);display:none;align-items:flex-start;justify-content:center;overflow:auto;z-index:30;padding:30px}
#lb img{max-width:min(1280px,95vw);border-radius:8px}
"""

JS = """
const tip=document.getElementById('tip');
document.querySelectorAll('[data-tip]').forEach(el=>{
 el.addEventListener('mousemove',e=>{tip.textContent=el.dataset.tip;tip.style.opacity=1;tip.style.left=(e.clientX+14)+'px';tip.style.top=(e.clientY+14)+'px'});
 el.addEventListener('mouseleave',()=>tip.style.opacity=0)});
const lb=document.getElementById('lb'),lbi=lb.querySelector('img');
document.querySelectorAll('a.lb').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();lbi.src=a.getAttribute('href');lb.style.display='flex'}));
lb.addEventListener('click',()=>lb.style.display='none');
"""


def build():
    items = load()
    ran = sum(1 for p in items if p.get("trial", {}).get("status") == "ran")
    partial = sum(1 for p in items if p.get("trial", {}).get("status") == "partial")
    shots = sum(len(p.get("screenshots", [])) for p in items)
    takeaways_file = ROOT / "takeaways.html"
    takeaways = takeaways_file.read_text(encoding="utf-8") if takeaways_file.exists() else "<p class='dim'>(ยังไม่ได้สรุป)</p>"
    nav = "".join(f"<a href='#p-{esc(p['slug'])}'>{esc(short_name(p))}</a>" for p in items)
    weights = " · ".join(f"{lbl} {w}%" for _, lbl, w in CRITERIA)
    out = f"""<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Research: ระบบที่คล้ายกับ LINE OA CS MCP</title><style>{CSS}</style></head><body>
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z"/></marker></defs></svg>
<div class="wrap">
<h1>Research: ระบบที่คล้ายกับงานของเรา</h1>
<p class="sub">โปรเจกต์ที่ทำเรื่องเดียวกัน (automate แชท LINE OA, MCP ที่ทำงานในนามผู้ใช้จริง, ระบบรวมแชท) ลองติดตั้ง ถ่ายภาพ สรุป feature และ flow แล้วให้คะแนน
สร้างจาก <code>test/research/data/*.json</code> ด้วย <code>tools/build.py</code> · ข้อมูล ณ {date.today().isoformat()}</p>
<div class="bar">
 <div class="stat"><b>{len(items)}</b><span>โปรเจกต์ / ผลิตภัณฑ์</span></div>
 <div class="stat"><b>{ran} + {partial}</b><span>รันได้จริง + รันได้บางส่วน</span></div>
 <div class="stat"><b>{shots}</b><span>ภาพที่ถ่ายไว้</span></div>
 <div class="stat"><b>7 + 1</b><span>agent Sonnet (medium) + orchestrator Opus (รอบ 2: 5 ตัว, รอบ 4: 2 ตัว)</span></div>
</div>
<nav class="nav"><a href="#take">สรุป</a><a href="#land">ภาพรวม</a><a href="#board">ตารางคะแนน</a><a href="#stars">GitHub stars</a><a href="#method">วิธีทำ</a>{nav}</nav>

<h2 id="take">สรุปสิ่งที่จะเอามาใช้กับงานของเรา</h2>
<div class="card">{takeaways}</div>

<h2 id="land">ภาพรวม: แต่ละกลุ่มให้อะไรกับงานของเรา</h2>
<p class="lede">กดที่ชื่อโปรเจกต์เพื่อไปที่รายละเอียด ข้อความบนเส้นคือสิ่งที่ยืมมาใช้กับ <code>lineoa-mcp</code></p>
<figure class="d"><div class="scroll">{landscape_svg(items)}</div></figure>

<h2 id="board">ตารางคะแนน</h2>
<p class="lede">คะแนนแต่ละเกณฑ์ 1-5 · น้ำหนัก: {weights} · ความนิยมคำนวณจาก GitHub stars (&lt;10=1, &lt;100=2, &lt;1k=3, &lt;10k=4, ≥10k=5) ถ้าไม่มี repo น้ำหนักจะถูกกระจายให้เกณฑ์อื่น · คะแนนรวม = ค่าเฉลี่ยถ่วงน้ำหนักของ (คะแนน-1)/4 × 100</p>
<div class="card scroll">{scoreboard(items)}</div>

<h2 id="stars">GitHub stars</h2>
<p class="lede">แกนเป็น log scale เพราะค่าห่างกันหลายหลัก ค่าตัวเลขอยู่ในตารางและในแต่ละโปรเจกต์ ชี้ที่แท่งเพื่อดู fork และวันที่ push ล่าสุด · stars ไม่เท่ากับจำนวนคนใช้จริง แต่เป็นตัวแทนที่หาได้</p>
<figure class="d"><div class="scroll">{stars_svg(items)}</div></figure>

<h2 id="method">วิธีทำ</h2>
<div class="card small">
<ul>
<li>Orchestrator (Opus, session plan) แบ่งเป็น 5 กลุ่ม แล้วส่งให้ agent Sonnet ระดับ medium กลุ่มละตัว ทำงานขนานกัน ทุกตัวใช้ brief เดียวกัน: <code>tools/AGENT_BRIEF.md</code> (รอบ 4 เพิ่มอีก 6 ตัวด้วย agent อีก 2 ตัว brief เดิม)</li>
<li>Agent clone repo ลง <code>_vendor/</code> (gitignore ไว้แล้ว) ติดตั้งแบบ <code>--ignore-scripts</code> ใช้ credential ปลอมเท่านั้น และไม่ส่งข้อความไปที่บริการจริงใด ๆ</li>
<li>ภาพ <span class="pill ok">real-run</span> คือผลลัพธ์ที่รันได้จริงในเครื่อง ส่วน <span class="pill mute">github-page / website / docs</span> คือภาพหน้าเว็บ</li>
<li>คำสั่งที่รันและผลลัพธ์จริงของแต่ละโปรเจกต์อยู่ใน <code>trials/&lt;slug&gt;.md</code></li>
<li>Agent เป็นคนให้คะแนน และให้เหตุผลประกอบทุกข้อ ส่วน orchestrator ตรวจทานและเป็นคนคำนวณคะแนนความนิยม</li>
</ul></div>

<h2>รายละเอียดทีละตัว (เรียงตามคะแนนรวม)</h2>
{''.join(project_section(p) for p in items)}
</div><div id="tip"></div><div id="lb"><img alt=""></div><script>{JS}</script></body></html>"""
    (ROOT / "index.html").write_text(out, encoding="utf-8")
    print(f"wrote {ROOT / 'index.html'}: {len(items)} projects, {shots} screenshots")


if __name__ == "__main__":
    build()
