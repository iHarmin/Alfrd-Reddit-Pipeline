import { SYSTEM_PROMPT, type RedditPost, type ScoredPost } from "./config";

async function callGroqWithRetry(body: object, apiKey: string, retries = 3): Promise<any> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      return await res.json();
    }

    // Rate limited — wait and retry
    if (res.status === 429) {
      const waitMs = Math.min(2000 * (attempt + 1), 10000);
      console.log(`Groq rate limited, waiting ${waitMs}ms (attempt ${attempt + 1}/${retries})`);
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }

    // Other error — don't retry
    throw new Error(`Groq API error: ${res.status}`);
  }
  throw new Error("Groq API rate limit exceeded after retries");
}

export async function scorePost(post: RedditPost): Promise<ScoredPost> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return {
      ...post,
      ai_score: 0,
      ai_reasoning: "No API key configured",
      ai_comment: "(Configure GROQ_API_KEY to enable AI drafting)",
    };
  }

  const userMessage = `Reddit Post from r/${post.subreddit}:

Title: ${post.title}

Body: ${post.selftext.slice(0, 1500) || "(no body text)"}

Matched keywords: ${post.matched_keywords.join(", ")}

---
Score this post's relevance to ALFRD (1-10) using the scoring rubric. Use the full range. Then draft a helpful comment.

Respond in this exact format:
RELEVANCE_SCORE: [1-10]
REASONING: [one sentence why this score]
DRAFT_COMMENT: [your suggested comment]`;

  try {
    const data = await callGroqWithRetry(
      {
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        temperature: 0.4,
        max_tokens: 500,
      },
      groqKey
    );

    const text = data.choices?.[0]?.message?.content?.trim() || "";

    let score = 0;
    let reasoning = "";
    let comment = "";

    // More robust parsing
    const scoreMatch = text.match(/RELEVANCE_SCORE:\s*(\d+)/i);
    if (scoreMatch) score = Math.min(10, Math.max(1, parseInt(scoreMatch[1])));

    const reasoningMatch = text.match(/REASONING:\s*(.+?)(?=\nDRAFT_COMMENT:|$)/i);
    if (reasoningMatch) reasoning = reasoningMatch[1].trim();

    const commentMatch = text.match(/DRAFT_COMMENT:\s*([\s\S]+)$/i);
    if (commentMatch) comment = commentMatch[1].trim();

    // If parsing completely failed, mark it clearly
    if (score === 0) {
      return {
        ...post,
        ai_score: 0,
        ai_reasoning: "AI response could not be parsed",
        ai_comment: text.slice(0, 500),
      };
    }

    return {
      ...post,
      ai_score: score,
      ai_reasoning: reasoning,
      ai_comment: comment,
    };
  } catch (err) {
    return {
      ...post,
      ai_score: 0,
      ai_reasoning: `AI scoring failed: ${err instanceof Error ? err.message : "unknown error"}`,
      ai_comment: "(Review this post manually)",
    };
  }
}
