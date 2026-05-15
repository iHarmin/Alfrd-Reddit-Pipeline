import { NextResponse } from "next/server";
import { pollNewPosts, fullScan } from "../../lib/reddit";
import { scorePost } from "../../lib/groq";
import type { ScoredPost, RedditPost } from "../../lib/config";
import type { StoredPost } from "../posts/route";
import fs from "fs";
import path from "path";

export const maxDuration = 60;

const POSTS_FILE = path.join(process.cwd(), "stored_posts.json");

function loadStoredPosts(): StoredPost[] {
  try {
    if (fs.existsSync(POSTS_FILE)) {
      return JSON.parse(fs.readFileSync(POSTS_FILE, "utf-8"));
    }
  } catch {
    console.error("Failed to load stored posts");
  }
  return [];
}

function saveStoredPosts(posts: StoredPost[]): void {
  fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const full = searchParams.get("full") === "true";

  // Incremental poll (fast) or full scan (initial)
  const newPosts = full ? await fullScan() : await pollNewPosts();

  const existingPosts = loadStoredPosts();
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

  console.log(`[Poll] ${newPosts.length} fetched, ${toScore.length} new to score`);

  // Score posts immediately (typically only 1-5 posts)
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
  saveStoredPosts(allPosts);

  return NextResponse.json({
    new_posts: scoredPosts.length,
    total: allPosts.length,
    polled_at: new Date().toISOString(),
  });
}
