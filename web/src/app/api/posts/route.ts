import { NextResponse } from "next/server";
import { loadStoredPosts, saveStoredPosts } from "../../lib/storage";
import type { StoredPost } from "../../lib/config";

export type { StoredPost };

// GET - return all stored posts
export async function GET() {
  const posts = await loadStoredPosts();
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

  const posts = await loadStoredPosts();
  const post = posts.find((p) => p.id === id);
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  post.status = status;
  post.reviewed_by = reviewed_by || undefined;
  post.reviewed_at = new Date().toISOString();

  await saveStoredPosts(posts);

  return NextResponse.json({ post });
}
