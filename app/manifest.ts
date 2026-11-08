import type { MetadataRoute } from "next";

// "Get the app" installs the web app to the home screen: same trip link, same answers, no account.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tripflow",
    short_name: "Tripflow",
    description: "Plan a group trip everyone can say yes to.",
    start_url: "/",
    display: "standalone",
    background_color: "#F4F0E8",
    theme_color: "#F4F0E8",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
