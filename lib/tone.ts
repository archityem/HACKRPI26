// Trip colors, shared by the UI and by the link-preview image (which runs on the server and can't import client code).
export const TRIP_TONES = ["sage", "apricot", "lavender", "rose", "butter", "sky", "dusk"] as const;
export type TripTone = (typeof TRIP_TONES)[number];

/** The ticket fill for each trip color (the values from theme/tokens.css). */
export const TONE_HEX: Record<TripTone, { bg: string; fg: string }> = {
  sage: { bg: "#C7D7B0", fg: "#22211F" },
  apricot: { bg: "#EDB48E", fg: "#22211F" },
  lavender: { bg: "#D0C7EA", fg: "#22211F" },
  rose: { bg: "#E0AFBB", fg: "#22211F" },
  butter: { bg: "#EFDCA6", fg: "#22211F" },
  sky: { bg: "#BCD2E8", fg: "#22211F" },
  dusk: { bg: "#59639C", fg: "#FFFFFF" },
};

export const hash = (s: string) => [...s].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);

/** A trip's color: the host's choice, else one picked from the trip code so the same trip always looks the same. */
export const tripToneFor = (code: string, chosen?: string): TripTone =>
  (TRIP_TONES as readonly string[]).includes(chosen ?? "") ? (chosen as TripTone) : TRIP_TONES[hash(code) % TRIP_TONES.length];
