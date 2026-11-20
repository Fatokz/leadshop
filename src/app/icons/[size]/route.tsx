import { ImageResponse } from "next/og";

const SIZES = [180, 192, 512];

// PNG app icons generated at request time (cached by the browser and the service worker).
export async function GET(req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size: raw } = await params;
  const size = SIZES.includes(Number(raw)) ? Number(raw) : 192;
  const maskable = new URL(req.url).searchParams.has("maskable");
  const inner = maskable ? size * 0.62 : size;

  return new ImageResponse(
    (
      <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", background: "#f25c1f", borderRadius: maskable ? 0 : size * 0.22 }}>
        <svg width={inner} height={inner} viewBox="0 0 64 64">
          <path d="M16 24h32l-3 24a4 4 0 0 1-4 3.5H23a4 4 0 0 1-4-3.5z" fill="#fff" />
          <path d="M24 24v-3a8 8 0 0 1 16 0v3" fill="none" stroke="#fbbf24" strokeWidth={4} strokeLinecap="round" />
          <path d="M27 31v12h10" fill="none" stroke="#f25c1f" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    ),
    { width: size, height: size, headers: { "Cache-Control": "public, max-age=604800, immutable" } },
  );
}
