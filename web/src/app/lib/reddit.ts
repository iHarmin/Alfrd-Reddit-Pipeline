import { KEYWORDS, PRIMARY_SUBREDDITS, SECONDARY_SUBREDDITS, type RedditPost } from "./config";

const API_BASE = "https://arctic-shift.photon-reddit.com/api/posts/search";

function isRelevant(title: string, selftext: string): string[] {
  const combined = (title + " " + selftext).toLowerCase();
  return KEYWORDS.filter((kw) => combined.includes(kw.toLowerCase()));
}

/** ISO date string for N hours ago */
function hoursAgoISO(hours: number): string {
  return new Date(Date.now() - hours * 3600_000).toISOString().split("T")[0];
}

function parsePost(p: Record<string, unknown>, fallbackSub: string): RedditPost | null {
  const selftext = p.selftext === "[removed]" ? "" : (p.selftext as string || "");
  const title = (p.title as string) || "";
  const matched = isRelevant(title, selftext);
  if (matched.length === 0) return null;

  return {
    id: p.id as string,
    subreddit: (p.subreddit as string) || fallbackSub,
    title,
    selftext,
    url: p.permalink
      ? `https://www.reddit.com${p.permalink}`
      : `https://www.reddit.com/r/${fallbackSub}/comments/${p.id}`,
    author: (p.author as string) || "[deleted]",
    score: (p.score as number) || 0,
    num_comments: (p.num_comments as number) || 0,
    created_utc: (p.created_utc as number) || 0,
    matched_keywords: matched,
  };
}

/**
 * Fetch all recent posts from a subreddit using Arctic Shift API,
 * then filter locally by keywords.
 */
async function fetchSubreddit(subName: string): Promise<RedditPost[]> {
  const after = hoursAgoISO(72);
  const url = `${API_BASE}?subreddit=${encodeURIComponent(subName)}&limit=25&sort=desc&after=${after}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    console.error(`[ArcticShift] r/${subName}: ${res.status}`);
    return [];
  }

  const data = await res.json();
  const items: Record<string, unknown>[] = data?.data ?? [];
  const posts: RedditPost[] = [];

  for (const p of items) {
    const post = parsePost(p, subName);
    if (post) posts.push(post);
  }

  return posts;
}

/**
 * Fetch from all tracked subreddits using Arctic Shift API.
 */
export async function scanSubreddits(): Promise<RedditPost[]> {
  const subs = [...PRIMARY_SUBREDDITS, ...SECONDARY_SUBREDDITS];

  const results = await Promise.allSettled(
    subs.map((sub) => fetchSubreddit(sub))
  );

  const allPosts: RedditPost[] = [];
  const seenIds = new Set<string>();

  for (const result of results) {
    if (result.status === "fulfilled") {
      for (const post of result.value) {
        if (!seenIds.has(post.id)) {
          seenIds.add(post.id);
          allPosts.push(post);
        }
      }
    }
  }

  console.log(`[ArcticShift] Found ${allPosts.length} matching posts across ${subs.length} subreddits`);
  return allPosts;
}
