import { NextResponse } from "next/server";
import { loadStoredPosts, saveStoredPosts } from "../../lib/storage";
import { requireAuth } from "../../lib/auth";
import type { StoredPost } from "../../lib/config";

export type { StoredPost };

// GET - return all stored posts
export async function GET(request: Request) {
  await requireAuth(request);
  const posts = await loadStoredPosts();
  return NextResponse.json({ posts });
}

// PATCH - update a post's status
export async function PATCH(request: Request) {
  const user = await requireAuth(request);
  const { id, status } = await request.json();

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
  post.reviewed_by = user.name;
  post.reviewed_at = new Date().toISOString();

  await saveStoredPosts(posts);

  return NextResponse.json({ post });
}
