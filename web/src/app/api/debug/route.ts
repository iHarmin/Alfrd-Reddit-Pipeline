import { NextResponse } from "next/server";
import { loadStoredPosts, saveStoredPosts } from "../../lib/storage";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action") || "status";

  const posts = await loadStoredPosts();

  if (action === "reset") {
    // Reset all posts: clear scores so they can be re-scored with Gemini
    for (const p of posts) {
      p.ai_score = 0;
      p.ai_reasoning = "Pending";
      p.ai_comment = "";
    }
    await saveStoredPosts(posts);
    return NextResponse.json({ action: "reset", total: posts.length });
  }

  if (action === "clear") {
    // Clear all posts entirely
    await saveStoredPosts([]);
    return NextResponse.json({ action: "clear", total: 0 });
  }

  const scored = posts.filter((p) => p.ai_score > 0).length;
  const pending = posts.filter((p) => p.ai_score === 0).length;
  return NextResponse.json({ total: posts.length, scored, pending });
}
