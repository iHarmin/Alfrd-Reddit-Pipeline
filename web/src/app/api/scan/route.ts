import { NextResponse } from "next/server";
import { scanSubreddits } from "../../lib/reddit";
import { scorePost } from "../../lib/groq";
import type { StoredPost } from "../../lib/config";
import { loadStoredPosts, saveStoredPosts } from "../../lib/storage";

export const maxDuration = 60;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") || "fetch"; // "fetch" or "score"

  if (mode === "score") {
    // Score one unscored post at a time
    const existingPosts = await loadStoredPosts();
    const unscored = existingPosts.filter(
      (p) => p.ai_score === 0 && (p.ai_reasoning?.startsWith("Pending") || p.ai_reasoning?.startsWith("AI scoring failed"))
    );
    if (unscored.length === 0) {
      return NextResponse.json({ mode: "score", scored: 0, remaining: 0, total: existingPosts.length });
    }
    const post = unscored[0];
    const result = await scorePost(post);
    const success = result.ai_score > 0;
    post.ai_score = result.ai_score;
    post.ai_reasoning = result.ai_reasoning;
    post.ai_comment = result.ai_comment;
    if (success) await saveStoredPosts(existingPosts);
    return NextResponse.json({
      mode: "score",
      scored: success ? 1 : 0,
      remaining: unscored.length - (success ? 1 : 0),
      total: existingPosts.length,
      error: success ? undefined : result.ai_reasoning,
    });
  }

  // Default: fetch new posts (no AI scoring - fast)
  const newPosts = await scanSubreddits();

  const existingPosts = await loadStoredPosts();
  const existingIds = new Set(existingPosts.map((p) => p.id));
  const toAdd = newPosts.filter((p) => !existingIds.has(p.id));

  if (toAdd.length === 0) {
    return NextResponse.json({
      new_posts: 0,
      total: existingPosts.length,
      polled_at: new Date().toISOString(),
    });
  }

  const now = new Date().toISOString();
  const stored: StoredPost[] = toAdd.map((post) => ({
    ...post,
    ai_score: 0,
    ai_reasoning: "Pending - will score on next pass",
    ai_comment: "",
    status: "remaining" as const,
    first_seen: now,
  }));

  const allPosts = [...existingPosts, ...stored];
  allPosts.sort((a, b) => b.created_utc - a.created_utc);
  await saveStoredPosts(allPosts);

  return NextResponse.json({
    new_posts: stored.length,
    total: allPosts.length,
    polled_at: new Date().toISOString(),
  });
}
