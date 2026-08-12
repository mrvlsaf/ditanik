import { ImageResponse } from "next/og";

/** iOS home-screen icon — panda face (same as logo). */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f3f4f2",
          borderRadius: 36,
          position: "relative",
        }}
      >
        {/* Face */}
        <div
          style={{
            width: 118,
            height: 118,
            borderRadius: 999,
            background: "#f4f4f2",
            position: "relative",
            display: "flex",
          }}
        />
        {/* Ears */}
        <div
          style={{
            position: "absolute",
            top: 28,
            left: 28,
            width: 42,
            height: 42,
            borderRadius: 999,
            background: "#141414",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 28,
            right: 28,
            width: 42,
            height: 42,
            borderRadius: 999,
            background: "#141414",
          }}
        />
        {/* Eye patches */}
        <div
          style={{
            position: "absolute",
            top: 68,
            left: 48,
            width: 36,
            height: 44,
            borderRadius: 999,
            background: "#141414",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 68,
            right: 48,
            width: 36,
            height: 44,
            borderRadius: 999,
            background: "#141414",
          }}
        />
        {/* Eyes */}
        <div
          style={{
            position: "absolute",
            top: 82,
            left: 58,
            width: 14,
            height: 14,
            borderRadius: 999,
            background: "#f4f4f2",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 82,
            right: 58,
            width: 14,
            height: 14,
            borderRadius: 999,
            background: "#f4f4f2",
          }}
        />
        {/* Nose */}
        <div
          style={{
            position: "absolute",
            top: 108,
            width: 18,
            height: 12,
            borderRadius: 999,
            background: "#1f8a4c",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
