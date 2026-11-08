// Stay options for the lodging vote. Prices are the destination's per-person nightly share times a multiplier.
export const LODGING: { id: string; name: string; note: string; mult: number }[] = [
  { id: "hostel", name: "Hostel dorms", note: "Cheapest. Social.", mult: 0.55 },
  { id: "apartment", name: "Shared apartment", note: "Kitchen and a living room.", mult: 1 },
  { id: "hotel", name: "Boutique hotel", note: "Own bed, central.", mult: 1.6 },
];
