// Client-side Reddit fetcher — fetches directly from browser (bypasses server 403)

import { KEYWORDS, PRIMARY_SUBREDDITS, SECONDARY_SUBREDDITS, type RedditPost } from "./config";

function isRelevant(title: string, selftext: string): string[] {
  const combined = (title + " " + selftext).toLowerCase();
  return KEYWORDS.filter((kw) => combined.includes(kw.toLowerCase()));
}

async function fetchSubreddit(subName: string): Promise<RedditPost[]> {
  // Fetch directly from user's browser — Reddit allows this (no CORS block for .json)
  const url = `https://www.reddit.com/r/${subName}/new.json?limit=100&raw_json=1`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`[Reddit] r/${subName} returned ${res.status}`);
    return [];
  }

  const data = await res.json();
  const children = data?.data?.children ?? [];
  if (children.length === 0) return [];

  const now = Date.now() / 1000;
  const maxAge = 72 * 3600;
  const posts: RedditPost[] = [];

  for (const child of children) {
    const p = child.data;
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

  return posts;
}

export async function fetchAllSubreddits(): Promise<RedditPost[]> {
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

  return allPosts;
}
