import { KEYWORDS, PRIMARY_SUBREDDITS, SECONDARY_SUBREDDITS, type RedditPost } from "./config";
import fs from "fs";
import path from "path";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
};

// Track newest post per subreddit for incremental polling
const ANCHORS_FILE = path.join(process.cwd(), "poll_anchors.json");

interface PollAnchors {
  [subreddit: string]: string; // subreddit -> newest post fullname (t3_id)
}

function loadAnchors(): PollAnchors {
  try {
    if (fs.existsSync(ANCHORS_FILE)) {
      return JSON.parse(fs.readFileSync(ANCHORS_FILE, "utf-8"));
    }
  } catch {}
  return {};
}

function saveAnchors(anchors: PollAnchors): void {
  fs.writeFileSync(ANCHORS_FILE, JSON.stringify(anchors, null, 2));
}

function isRelevant(title: string, selftext: string): string[] {
  const combined = (title + " " + selftext).toLowerCase();
  return KEYWORDS.filter((kw) => combined.includes(kw.toLowerCase()));
}

/**
 * Fetch only NEW posts from a subreddit since the last poll.
 * Uses `before` parameter to only get posts newer than our anchor.
 * Fast: typically returns 0-5 posts per sub.
 */
async function fetchNewPosts(subName: string, anchor: string | undefined): Promise<{ posts: RedditPost[]; newestFullname: string | null }> {
  const url = `https://www.reddit.com/r/${subName}/new.json?limit=100&raw_json=1${anchor ? `&before=${anchor}` : ""}`;

  const res = await fetch(url, { headers: HEADERS, next: { revalidate: 0 } });
  if (!res.ok) return { posts: [], newestFullname: null };

  const data = await res.json();
  const children = data?.data?.children ?? [];
  if (children.length === 0) return { posts: [], newestFullname: null };

  const now = Date.now() / 1000;
  const maxAge = 72 * 3600;
  const posts: RedditPost[] = [];
  let newestFullname: string | null = null;

  for (const child of children) {
    const p = child.data;
    // Track the newest post
    if (!newestFullname) newestFullname = child.kind + "_" + p.id;

    if (now - p.created_utc > maxAge) continue;

    const selftext = p.selftext || "";
    const matched = isRelevant(p.title, selftext);
    if (matched.length === 0) continue;

    posts.push({
      id: p.id,
      subreddit: p.subreddit || subName,
      title: p.title,
      selftext,
      url: `https://www.reddit.com${p.permalink}`,
      author: p.author || "[deleted]",
      score: p.score || 0,
      num_comments: p.num_comments || 0,
      created_utc: p.created_utc,
      matched_keywords: matched,
    });
  }

  return { posts, newestFullname };
}

/**
 * Incremental poll: fetch only NEW posts across all subreddits.
 * Uses anchors to avoid re-fetching seen posts. Very fast.
 */
export async function pollNewPosts(): Promise<RedditPost[]> {
  const subs = [...PRIMARY_SUBREDDITS, ...SECONDARY_SUBREDDITS];
  const anchors = loadAnchors();

  const results = await Promise.allSettled(
    subs.map((sub) => fetchNewPosts(sub, anchors[sub]))
  );

  const allPosts: RedditPost[] = [];
  const seenIds = new Set<string>();
  const newAnchors = { ...anchors };

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "fulfilled") {
      const { posts, newestFullname } = result.value;
      if (newestFullname) {
        newAnchors[subs[i]] = newestFullname;
      }
      for (const post of posts) {
        if (!seenIds.has(post.id)) {
          seenIds.add(post.id);
          allPosts.push(post);
        }
      }
    }
  }

  saveAnchors(newAnchors);
  return allPosts;
}

/**
 * Full scan: fetch latest posts without anchors (for initial load).
 * Still fast - only 25 posts per sub.
 */
export async function fullScan(): Promise<RedditPost[]> {
  const subs = [...PRIMARY_SUBREDDITS, ...SECONDARY_SUBREDDITS];
  const anchors: PollAnchors = {};

  const results = await Promise.allSettled(
    subs.map((sub) => fetchNewPosts(sub, undefined))
  );

  const allPosts: RedditPost[] = [];
  const seenIds = new Set<string>();

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "fulfilled") {
      const { posts, newestFullname } = result.value;
      if (newestFullname) {
        anchors[subs[i]] = newestFullname;
      }
      for (const post of posts) {
        if (!seenIds.has(post.id)) {
          seenIds.add(post.id);
          allPosts.push(post);
        }
      }
    }
  }

  saveAnchors(anchors);
  return allPosts;
}
