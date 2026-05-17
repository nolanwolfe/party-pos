import { ImageResponse } from "next/og"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ fontSize: 130, background: "#1c1c1e", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      🍸
    </div>,
    { ...size }
  )
}
