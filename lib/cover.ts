// The host's invite picture. The browser shrinks it before upload; the server stores it as a data URL
// on the trip and serves the bytes from /api/trips/[code]/cover so the polled snapshot stays small.

export const COVER_MAX_BYTES = 600_000; // decoded image size the server accepts
export const COVER_MAX_EDGE = 1400; // px, longest side after the browser resizes it

export type CoverType = "image/jpeg" | "image/png" | "image/webp";

// The declared type must match the file's actual signature, so nothing else can be served as an image.
const SIGNATURES: Record<CoverType, (b: Uint8Array) => boolean> = {
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b) => [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((x, i) => b[i] === x),
  "image/webp": (b) => ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WEBP",
};
const ascii = (b: Uint8Array, from: number, to: number) => String.fromCharCode(...b.subarray(from, to));

const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/;

/** Decode and check a cover data URL. Returns null if it isn't a real, small enough JPEG/PNG/WebP. */
export function parseCover(dataUrl: string): { type: CoverType; bytes: Buffer } | null {
  const m = DATA_URL.exec(dataUrl);
  if (!m) return null;
  const type = m[1] as CoverType;
  const bytes = Buffer.from(m[2], "base64");
  if (bytes.length < 12 || bytes.length > COVER_MAX_BYTES) return null;
  return SIGNATURES[type](bytes) ? { type, bytes } : null;
}

export const coverUrl = (code: string) => `/api/trips/${code}/cover`;
