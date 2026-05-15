import { NextResponse } from "next/server";

export async function GET() {
  const tests = [
    {
      name: "Pullpush API",
      url: "https://api.pullpush.io/reddit/search/submission/?subreddit=Accounting&sort=created_utc&order=desc&size=5",
    },
    {
      name: "Arctic Shift API",
      url: "https://arctic-shift.photon-reddit.com/api/posts?subreddit=Accounting&sort=created_utc&order=desc&limit=5",
    },
  ];

  const results = [];
  for (const test of tests) {
    try {
      const res = await fetch(test.url, {
        headers: { "User-Agent": "ALFRD-Reddit-Monitor/1.0" },
      });
      const text = await res.text();
      results.push({
        name: test.name,
        status: res.status,
        contentType: res.headers.get("content-type")?.slice(0, 50),
        bodyPreview: text.slice(0, 300),
      });
    } catch (err: any) {
      results.push({ name: test.name, error: err.message });
    }
  }

  return NextResponse.json(results);
}
