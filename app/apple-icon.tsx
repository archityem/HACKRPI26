import { ImageResponse } from "next/og";

// The icon iOS uses when someone adds Tripflow to their home screen. iOS rounds the corners itself.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#C7D7B0", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="118" height="118" viewBox="0 0 120 120">
          <rect x="6" y="24" width="108" height="72" rx="17" fill="#22211F" />
          <circle cx="6" cy="60" r="11" fill="#C7D7B0" />
          <circle cx="114" cy="60" r="11" fill="#C7D7B0" />
          <path d="M26 60C40 34 54 34 62 60S84 86 94 60" fill="none" stroke="#C7D7B0" strokeWidth="9" strokeLinecap="round" />
        </svg>
      </div>
    ),
    size,
  );
}
