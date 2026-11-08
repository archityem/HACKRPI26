import { hashToken, readToken } from "./credential";
import { getStore } from "./store";
import type { Member } from "./types";

export { hashToken, newToken, readToken } from "./credential";

export type AuthOk = { member: Member };
export type AuthFail = { status: 401 | 403; error: string };

/**
 * Who is acting, from their private credential. A public member id is not authorization:
 * when the body names someone, it has to be the person this credential belongs to.
 */
export async function authenticate(req: Request, code: string, claimedId?: string | null): Promise<AuthOk | AuthFail> {
  const token = readToken(req);
  if (!token) return { status: 401, error: "Join the trip on this device first" };
  const member = await (await getStore()).memberByToken(code, hashToken(token));
  if (!member) return { status: 401, error: "Join the trip on this device first" };
  if (claimedId && claimedId !== member.id) return { status: 403, error: "That member doesn’t match this device" };
  return { member };
}
