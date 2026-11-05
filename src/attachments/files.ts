import { createHash, randomBytes } from "node:crypto";
import { chmodSync, mkdirSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

/** The type comes from the file's first bytes, never from its name or what the server claims. */
export function sniffMime(b: Uint8Array): { mime: string; ext: string } {
  const at = (i: number, ...xs: number[]) => xs.every((x, k) => b[i + k] === x);
  const ascii = (i: number, s: string) => at(i, ...[...s].map((ch) => ch.charCodeAt(0)));
  if (at(0, 0xff, 0xd8, 0xff)) return { mime: "image/jpeg", ext: "jpg" };
  if (at(0, 0x89, 0x50, 0x4e, 0x47)) return { mime: "image/png", ext: "png" };
  if (ascii(0, "GIF8")) return { mime: "image/gif", ext: "gif" };
  if (ascii(0, "RIFF") && ascii(8, "WEBP")) return { mime: "image/webp", ext: "webp" };
  if (ascii(0, "%PDF")) return { mime: "application/pdf", ext: "pdf" };
  if (at(0, 0x50, 0x4b, 0x03, 0x04)) return { mime: "application/zip", ext: "zip" }; // also docx/xlsx
  if (ascii(4, "ftyp")) return { mime: "video/mp4", ext: "mp4" }; // also m4a voice notes
  if (b.length && b.subarray(0, 512).every((x) => x === 9 || x === 10 || x === 13 || x >= 32))
    return { mime: "text/plain", ext: "txt" };
  return { mime: "application/octet-stream", ext: "bin" };
}

/** Saves bytes under the cache dir, named by content hash. Written to a temp name first, then renamed. */
export function saveToCache(dir: string, bytes: Uint8Array, ext: string): string {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const path = join(dir, `${createHash("sha256").update(bytes).digest("hex").slice(0, 32)}.${ext}`);
  const tmp = `${path}.${randomBytes(4).toString("hex")}.part`;
  writeFileSync(tmp, bytes, { mode: 0o600 });
  renameSync(tmp, path);
  chmodSync(path, 0o600);
  return path;
}

/** Shrinks an image to at most `maxEdge` px on the long side, as JPEG. Small enough for a vision model. */
export async function shrinkImage(
  bytes: Uint8Array,
  maxEdge = 1568,
): Promise<{ data: Buffer; width: number; height: number }> {
  const { data, info } = await sharp(bytes)
    .rotate()
    .resize({ width: maxEdge, height: maxEdge, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}
