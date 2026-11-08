import { createHash, randomBytes } from "node:crypto";

/** Device secret returned once at create/join. Only the hash is stored. */
export const newToken = () => randomBytes(32).toString("base64url");

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

const TOKEN = /^[A-Za-z0-9_-]{20,200}$/;

/** Bearer token from the request, or null when the header is missing or not a credential. */
export function readToken(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (!header) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  if (!match || !TOKEN.test(match[1])) return null;
  return match[1];
}
