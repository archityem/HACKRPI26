import type { Config } from "tailwindcss";

/**
 * Tailwind v4 still accepts a content list. Scanning stays on the Ticket Stack
 * UI (app routes and components) and ignores tests, the kit, and data files.
 */
const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
};
export default config;
