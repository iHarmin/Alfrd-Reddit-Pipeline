import { NextResponse } from "next/server";

// Edge runtime runs on CDN nodes, not blocked by Reddit like serverless functions
export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sub = searchParams.get("sub");

  if (!sub) {
    return NextResponse.json({ error: "sub parameter required" }, { status: 400 });
  }

  const url = `https://old.reddit.com/r/${encodeURIComponent(sub)}/new.json?limit=100&raw_json=1`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "ALFRD-Reddit-Monitor/1.0",
        "Accept": "application/json",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Reddit returned ${res.status}`, children: [] },
        { status: 200 }
      );
    }

    const data = await res.json();
    return NextResponse.json({ children: data?.data?.children ?? [] });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message, children: [] },
      { status: 200 }
    );
  }
}
