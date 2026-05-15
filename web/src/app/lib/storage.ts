import { Redis } from "@upstash/redis";
import fs from "fs";
import path from "path";

// Use Upstash Redis when configured (Vercel), fall back to file system (local dev)
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

const DATA_DIR = process.cwd();

// --- Generic helpers ---

async function getJSON<T>(key: string, fallbackFile: string): Promise<T | null> {
  if (redis) {
    const data = await redis.get<T>(key);
    return data ?? null;
  }
  // File fallback for local dev
  const filePath = path.join(DATA_DIR, fallbackFile);
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    }
  } catch {}
  return null;
}

async function setJSON<T>(key: string, fallbackFile: string, data: T): Promise<void> {
  if (redis) {
    await redis.set(key, data);
    return;
  }
  const filePath = path.join(DATA_DIR, fallbackFile);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// --- Posts ---

import type { StoredPost } from "./config";

export async function loadStoredPosts(): Promise<StoredPost[]> {
  return (await getJSON<StoredPost[]>("alfrd:posts", "stored_posts.json")) ?? [];
}

export async function saveStoredPosts(posts: StoredPost[]): Promise<void> {
  await setJSON("alfrd:posts", "stored_posts.json", posts);
}

// --- Poll Anchors ---

export interface PollAnchors {
  [subreddit: string]: string;
}

export async function loadAnchors(): Promise<PollAnchors> {
  return (await getJSON<PollAnchors>("alfrd:anchors", "poll_anchors.json")) ?? {};
}

export async function saveAnchors(anchors: PollAnchors): Promise<void> {
  await setJSON("alfrd:anchors", "poll_anchors.json", anchors);
}
