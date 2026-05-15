import { NextResponse } from "next/server";
import { scanSubreddits } from "../../lib/reddit";
import { scorePosts } from "../../lib/groq";
import type { StoredPost } from "../../lib/config";
import { loadStoredPosts, saveStoredPosts } from "../../lib/storage";

export const maxDuration = 60;

// Batch size for Gemini scoring (15 posts per API call)
const SCORE_BATCH_SIZE = 10;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") || "full"; // "full", "fetch", or "score"

  const existingPosts = await loadStoredPosts();

  if (mode === "score") {
    // Score unscored posts only
    const unscored = existingPosts.filter(
      (p) => p.ai_score === 0 &&
        (p.ai_reasoning?.startsWith("Pending") || p.ai_reasoning?.includes("error") || p.ai_reasoning?.includes("Error"))
    );
    if (unscored.length === 0) {
      return NextResponse.json({ mode: "score", scored: 0, remaining: 0, total: existingPosts.length });
    }
    const batch = unscored.slice(0, SCORE_BATCH_SIZE);
    const scored = await scorePosts(batch);
    // Update posts in place
    for (const s of scored) {
      const idx = existingPosts.findIndex((p) => p.id === s.id);
      if (idx >= 0 && s.ai_score > 0) {
        existingPosts[idx].ai_score = s.ai_score;
        existingPosts[idx].ai_reasoning = s.ai_reasoning;
        existingPosts[idx].ai_comment = s.ai_comment;
      }
    }
    await saveStoredPosts(existingPosts);
    const successCount = scored.filter((s) => s.ai_score > 0).length;
    const firstFailed = scored.find((s) => s.ai_score === 0);
    const allReasons = [...new Set(scored.filter((s) => s.ai_score === 0).map((s) => s.ai_reasoning))];
    return NextResponse.json({
      mode: "score",
      scored: successCount,
      remaining: unscored.length - successCount,
      total: existingPosts.length,
      batchSize: batch.length,
      debug: firstFailed ? allReasons.slice(0, 3) : undefined,
    });
  }

  // Fetch new posts from Reddit
  const newPosts = await scanSubreddits();
  const existingIds = new Set(existingPosts.map((p) => p.id));
  const toAdd = newPosts.filter((p) => !existingIds.has(p.id));

  if (mode === "fetch") {
    // Just fetch, no scoring
    if (toAdd.length === 0) {
      return NextResponse.json({ new_posts: 0, total: existingPosts.length, polled_at: new Date().toISOString() });
    }
    const now = new Date().toISOString();
    const stored: StoredPost[] = toAdd.map((post) => ({
      ...post, ai_score: 0, ai_reasoning: "Pending", ai_comment: "", status: "remaining" as const, first_seen: now,
    }));
    const allPosts = [...existingPosts, ...stored].sort((a, b) => b.created_utc - a.created_utc);
    await saveStoredPosts(allPosts);
    return NextResponse.json({ new_posts: stored.length, total: allPosts.length, polled_at: now });
  }

  // mode === "full": Fetch + Score in one call
  const now = new Date().toISOString();
  let allPosts = existingPosts;

  if (toAdd.length > 0) {
    // Score new posts immediately (batch)
    const scored = await scorePosts(toAdd.slice(0, SCORE_BATCH_SIZE));
    const stored: StoredPost[] = scored.map((s) => ({
      ...s, status: "remaining" as const, first_seen: now,
    }));
    // Add remaining unscored new posts
    const unscoredNew: StoredPost[] = toAdd.slice(SCORE_BATCH_SIZE).map((p) => ({
      ...p, ai_score: 0, ai_reasoning: "Pending", ai_comment: "", status: "remaining" as const, first_seen: now,
    }));
    allPosts = [...existingPosts, ...stored, ...unscoredNew].sort((a, b) => b.created_utc - a.created_utc);
    await saveStoredPosts(allPosts);
  }

  const scoredCount = allPosts.filter((p) => p.ai_score > 0).length;
  return NextResponse.json({
    new_posts: toAdd.length,
    total: allPosts.length,
    scored: scoredCount,
    polled_at: now,
  });
}
