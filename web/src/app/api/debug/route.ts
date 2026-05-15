import { NextResponse } from "next/server";

export async function GET() {
  const arcticUrl = "https://arctic-shift.photon-reddit.com/api/posts/search?subreddit=Accounting&limit=5&sort=desc";
  const tests = [
    {
      name: "Arctic Shift (correct URL)",
      url: arcticUrl,
    },
  ];

  const results = [];
  for (const test of tests) {
    try {
      const res = await fetch(test.url, { cache: "no-store" });
      const text = await res.text();
      results.push({
        name: test.name,
        url: test.url,
        status: res.status,
        contentType: res.headers.get("content-type")?.slice(0, 50),
        bodyPreview: text.slice(0, 300),
      });
    } catch (err: unknown) {
      results.push({ name: test.name, url: test.url, error: String(err) });
    }
  }

  return NextResponse.json({ version: 2, results });
}
