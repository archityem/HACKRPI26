import type { Member } from "./types";

type Answers = Pick<Member, "origin" | "start" | "end" | "min" | "max" | "prefs" | "deals">;

const normList = (xs: readonly string[]) => [...new Set(xs)].sort().join("\0");

/** Constraint fields that change who can go and what is affordable. Name is not one of them. */
export function sameConstraints(a: Answers, b: Answers): boolean {
  return a.origin.trim().toUpperCase() === b.origin.trim().toUpperCase()
    && a.start === b.start
    && a.end === b.end
    && a.min === b.min
    && a.max === b.max
    && normList(a.prefs) === normList(b.prefs)
    && normList(a.deals) === normList(b.deals);
}

/** A new person, their first answers, or a real constraint edit. Resaving the same answers is not. */
export function invalidatesAgreement(existing: Member | undefined, next: Answers): boolean {
  if (!existing?.ready) return true;
  return !sameConstraints(existing, next);
}
