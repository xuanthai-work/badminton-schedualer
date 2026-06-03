import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#a3e635",
          color: "#0f172a",
          fontSize: 240,
          fontWeight: 800,
          letterSpacing: "-0.06em",
        }}
      >
        BS
      </div>
    ),
    { ...size }
  );
}
