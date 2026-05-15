import { SYSTEM_PROMPT, type RedditPost, type ScoredPost } from "./config";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

/**
 * Score a batch of posts in a SINGLE API call using Google Gemini.
 * This avoids per-post rate limits — one call scores up to 15 posts.
 */
export async function scorePosts(posts: RedditPost[]): Promise<ScoredPost[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return posts.map((p) => ({
      ...p,
      ai_score: 0,
      ai_reasoning: "No GEMINI_API_KEY configured",
      ai_comment: "",
    }));
  }

  // Build a single prompt for all posts
  const postDescriptions = posts.map((post, i) => {
    const body = post.selftext?.slice(0, 800) || "(no body text)";
    return `--- POST ${i + 1} ---
Subreddit: r/${post.subreddit}
Title: ${post.title}
Body: ${body}
Keywords matched: ${post.matched_keywords.join(", ")}`;
  }).join("\n\n");

  const userMessage = `Score these ${posts.length} Reddit posts for relevance to ALFRD. For EACH post, respond in this exact format:

POST 1:
RELEVANCE_SCORE: [1-10]
REASONING: [one sentence]
DRAFT_COMMENT: [your comment, 3-5 sentences]

POST 2:
RELEVANCE_SCORE: [1-10]
REASONING: [one sentence]
DRAFT_COMMENT: [your comment, 3-5 sentences]

...and so on for all ${posts.length} posts.

Here are the posts:

${postDescriptions}`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: userMessage }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 8000,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[Gemini] API error ${res.status}: ${err.slice(0, 200)}`);
      return posts.map((p) => ({
        ...p,
        ai_score: 0,
        ai_reasoning: `Gemini API error: ${res.status}`,
        ai_comment: "",
      }));
    }

    const data = await res.json();
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    console.log(`[Gemini] Response length: ${text.length} chars for ${posts.length} posts`);
    console.log(`[Gemini] First 200 chars: ${text.slice(0, 200)}`);

    // Parse response for each post
    return posts.map((post, i) => {
      const postNum = i + 1;
      const nextPostNum = i + 2;

      // Find the section for this post (between POST N and POST N+1)
      const startPattern = new RegExp(`POST\\s*${postNum}[:\\s]`, "i");
      const endPattern = new RegExp(`POST\\s*${nextPostNum}[:\\s]`, "i");

      const startMatch = text.match(startPattern);
      if (!startMatch || startMatch.index === undefined) {
        return { ...post, ai_score: 0, ai_reasoning: "Could not parse AI response for this post", ai_comment: "" };
      }

      const startIdx = startMatch.index;
      const endMatch = text.slice(startIdx + 5).match(endPattern);
      const section = endMatch && endMatch.index !== undefined
        ? text.slice(startIdx, startIdx + 5 + endMatch.index)
        : text.slice(startIdx);

      const scoreM = section.match(/RELEVANCE_SCORE:\s*(\d+)/i);
      const reasonM = section.match(/REASONING:\s*(.+)/i);
      const commentM = section.match(/DRAFT_COMMENT:\s*([\s\S]*?)$/i);

      if (scoreM) {
        return {
          ...post,
          ai_score: Math.min(10, Math.max(1, parseInt(scoreM[1]))),
          ai_reasoning: reasonM?.[1]?.trim() || "",
          ai_comment: commentM?.[1]?.trim() || "",
        };
      }

      return { ...post, ai_score: 0, ai_reasoning: "Could not parse AI response for this post", ai_comment: "" };
    });
  } catch (err) {
    console.error(`[Gemini] Error: ${err}`);
    return posts.map((p) => ({
      ...p,
      ai_score: 0,
      ai_reasoning: `AI scoring error: ${err instanceof Error ? err.message : "unknown"}`,
      ai_comment: "",
    }));
  }
}

/**
 * Score a single post (backwards compatible).
 */
export async function scorePost(post: RedditPost): Promise<ScoredPost> {
  const results = await scorePosts([post]);
  return results[0];
}
