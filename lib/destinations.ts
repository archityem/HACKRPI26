import type { Destination } from "./types";

// Fixture destinations from the prototype. Replaced by Gemini proposals + real fares later.
export const FIXTURE_DESTINATIONS: Destination[] = [
  { id: "sanjuan", name: "San Juan", country: "Puerto Rico", emoji: "🌴", tags: ["beach", "food", "culture", "nightlife"], flight: { BOS: 264, JFK: 238, ALB: 330 }, night: 52, daily: 25, hours: 4.3, stops: 0, domestic: true, overnight: false, caption: "Beach mornings. Old-town evenings." },
  { id: "cancun", name: "Cancún", country: "Mexico", emoji: "🐚", tags: ["beach", "nightlife", "nature"], flight: { BOS: 285, JFK: 260, ALB: 405 }, night: 48, daily: 27.5, hours: 4.8, stops: 0, domestic: false, overnight: false, caption: "A little adventure. A lot of ocean." },
  { id: "miami", name: "Miami", country: "Florida, US", emoji: "🦩", tags: ["beach", "food", "nightlife", "city"], flight: { BOS: 220, JFK: 205, ALB: 260 }, night: 62, daily: 29, hours: 3.5, stops: 0, domestic: true, overnight: false, caption: "Art walks, late nights, beach naps." },
  { id: "lisbon", name: "Lisbon", country: "Portugal", emoji: "🍊", tags: ["food", "culture", "city"], flight: { BOS: 480, JFK: 460, ALB: 650 }, night: 60, daily: 30, hours: 6.5, stops: 0, domestic: false, overnight: true, caption: "Tiled streets and pastry breaks." },
  { id: "costarica", name: "Costa Rica", country: "San José + coast", emoji: "🌿", tags: ["nature", "beach", "food"], flight: { BOS: 400, JFK: 340, ALB: 490 }, night: 52, daily: 25, hours: 7.2, stops: 1, domestic: false, overnight: false, caption: "For the people who take the scenic route." },
];
