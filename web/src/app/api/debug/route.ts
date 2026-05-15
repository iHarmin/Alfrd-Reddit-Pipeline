import { NextResponse } from "next/server";
import { loadStoredPosts, saveStoredPosts } from "../../lib/storage";

export async function GET() {
  // Reset failed posts back to pending so they can be re-scored
  const posts = await loadStoredPosts();
  let reset = 0;
  for (const p of posts) {
    if (p.ai_score === 0 && p.ai_reasoning?.startsWith("AI scoring failed")) {
      p.ai_reasoning = "Pending - will score on next pass";
      p.ai_comment = "";
      reset++;
    }
  }
  if (reset > 0) await saveStoredPosts(posts);
  const scored = posts.filter((p) => p.ai_score > 0).length;
  const pending = posts.filter((p) => p.ai_score === 0).length;
  return NextResponse.json({ total: posts.length, scored, pending, reset });
}
