import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export const alt = `${SITE_NAME} - AI 智能阅读`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #faf7f2 0%, #f0e8dc 100%)",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 80,
            height: 80,
            borderRadius: 20,
            background: "#faf7f2",
            color: "#c45c26",
            fontSize: 44,
            fontWeight: 700,
            marginBottom: 32,
          }}
        >
          R
        </div>
        <div style={{ fontSize: 64, fontWeight: 700, color: "#2c2416", marginBottom: 16 }}>
          {SITE_NAME}
        </div>
        <div
          style={{
            fontSize: 28,
            color: "#6b5d4d",
            maxWidth: 800,
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          {SITE_DESCRIPTION}
        </div>
      </div>
    ),
    { ...size },
  );
}
