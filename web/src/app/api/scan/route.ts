import { NextResponse } from "next/server";
import { scanSubreddits } from "../../lib/reddit";
import { scorePost } from "../../lib/groq";
import type { StoredPost } from "../../lib/config";
import { loadStoredPosts, saveStoredPosts } from "../../lib/storage";

export const maxDuration = 60;

// Score at most this many posts per invocation to avoid timeout
const MAX_SCORE_PER_CALL = 5;

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

  // Score a limited batch with AI, save the rest unscored
  const batch = toScore.slice(0, MAX_SCORE_PER_CALL);
  const rest = toScore.slice(MAX_SCORE_PER_CALL);
  const scoredPosts: StoredPost[] = [];
  const now = new Date().toISOString();

  for (const post of batch) {
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

  // Save unscored posts too (they'll be visible but with score 0)
  for (const post of rest) {
    scoredPosts.push({
      ...post,
      ai_score: 0,
      ai_reasoning: "Pending - will score on next scan",
      ai_comment: "",
      status: "remaining",
      first_seen: now,
    });
  }

  // Also score a few previously-unscored posts from existing
  const unscoredExisting = existingPosts.filter(
    (p) => p.ai_score === 0 && p.ai_reasoning?.startsWith("Pending")
  );
  const extraBatch = unscoredExisting.slice(0, MAX_SCORE_PER_CALL);
  for (const post of extraBatch) {
    try {
      const scored = await scorePost(post);
      Object.assign(post, {
        ai_score: scored.ai_score,
        ai_reasoning: scored.ai_reasoning,
        ai_comment: scored.ai_comment,
      });
    } catch { /* leave as-is */ }
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
