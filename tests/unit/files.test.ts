import { mkdtempSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { saveToCache, shrinkImage, sniffMime } from "../../src/attachments/files.js";

describe("attachment files", () => {
  it("detects the type from the bytes, not the name", () => {
    expect(sniffMime(new TextEncoder().encode("%PDF-1.4")).mime).toBe("application/pdf");
    expect(sniffMime(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])).mime).toBe("image/jpeg");
    expect(sniffMime(new Uint8Array([0x50, 0x4b, 0x03, 0x04])).ext).toBe("zip");
    expect(sniffMime(new Uint8Array([0, 1, 2, 3])).mime).toBe("application/octet-stream");
  });

  it("saves to the cache with owner-only permissions", () => {
    const dir = mkdtempSync(join(tmpdir(), "att-"));
    const path = saveToCache(dir, new TextEncoder().encode("hello"), "txt");
    expect(readFileSync(path, "utf8")).toBe("hello");
    // NTFS has no POSIX modes; Windows relies on the profile folder's permissions.
    if (process.platform !== "win32") expect(statSync(path).mode & 0o777).toBe(0o600);
  });

  it("shrinks a big image to the long-edge limit", async () => {
    const big = await sharp({ create: { width: 3000, height: 1500, channels: 3, background: "#fff" } })
      .png()
      .toBuffer();
    const out = await shrinkImage(big);
    expect([out.width, out.height]).toEqual([1568, 784]);
    expect(sniffMime(out.data).mime).toBe("image/jpeg");
  });
});
