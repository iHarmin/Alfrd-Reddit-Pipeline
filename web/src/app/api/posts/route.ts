import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export interface StoredPost {
  id: string;
  subreddit: string;
  title: string;
  selftext: string;
  url: string;
  author: string;
  score: number;
  num_comments: number;
  created_utc: number;
  matched_keywords: string[];
  ai_score: number;
  ai_reasoning: string;
  ai_comment: string;
  status: "remaining" | "reviewed" | "replied" | "skipped";
  reviewed_by?: string;
  reviewed_at?: string;
  first_seen: string;
}

const POSTS_FILE = path.join(process.cwd(), "stored_posts.json");

function loadPosts(): StoredPost[] {
  try {
    if (fs.existsSync(POSTS_FILE)) {
      return JSON.parse(fs.readFileSync(POSTS_FILE, "utf-8"));
    }
  } catch {
    console.error("Failed to load stored posts");
  }
  return [];
}

function savePosts(posts: StoredPost[]): void {
  fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));
}

// GET - return all stored posts
export async function GET() {
  const posts = loadPosts();
  return NextResponse.json({ posts });
}

// PATCH - update a post's status
export async function PATCH(request: Request) {
  const { id, status, reviewed_by } = await request.json();

  if (!id || !status) {
    return NextResponse.json({ error: "id and status required" }, { status: 400 });
  }

  const validStatuses = ["remaining", "reviewed", "replied", "skipped"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const posts = loadPosts();
  const post = posts.find((p) => p.id === id);
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  post.status = status;
  post.reviewed_by = reviewed_by || undefined;
  post.reviewed_at = new Date().toISOString();

  savePosts(posts);

  return NextResponse.json({ post });
}
