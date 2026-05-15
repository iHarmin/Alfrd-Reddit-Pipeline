import { NextResponse } from "next/server";
import { scanSubreddits } from "../../lib/reddit";
import { scorePost } from "../../lib/groq";
import type { StoredPost } from "../../lib/config";
import { loadStoredPosts, saveStoredPosts } from "../../lib/storage";

export const maxDuration = 60;

export async function GET() {
  const newPosts = await scanSubreddits();

  const existingPosts = await loadStoredPosts();
  const existingIds = new Set(existingPosts.map((p) => p.id));

  // Only score posts we haven't seen before
  const toScore = newPosts.filter((p) => !existingIds.has(p.id));

  if (toScore.length === 0) {
    return NextResponse.json({
      new_posts: 0,
      total: existingPosts.length,
      polled_at: new Date().toISOString(),
    });
  }

  console.log(`[Scan] ${newPosts.length} fetched, ${toScore.length} new to score`);

  // Score new posts with AI
  const scoredPosts: StoredPost[] = [];
  const now = new Date().toISOString();

  for (const post of toScore) {
    try {
      const scored = await scorePost(post);
      scoredPosts.push({
        ...scored,
        status: "remaining",
        first_seen: now,
      });
    } catch {
      scoredPosts.push({
        ...post,
        ai_score: 0,
        ai_reasoning: "Scoring error",
        ai_comment: "(Review manually)",
        status: "remaining",
        first_seen: now,
      });
    }
  }

  // Merge and save (newest first)
  const allPosts = [...existingPosts, ...scoredPosts];
  allPosts.sort((a, b) => b.created_utc - a.created_utc);
  await saveStoredPosts(allPosts);

  return NextResponse.json({
    new_posts: scoredPosts.length,
    total: allPosts.length,
    polled_at: new Date().toISOString(),
  });
}
