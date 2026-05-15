import nodemailer from "nodemailer";
import type { ScoredPost } from "./config";

function createTransporter() {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_SENDER,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
  });
}

function formatPost(post: ScoredPost): string {
  return `SUBREDDIT: r/${post.subreddit}
TITLE: ${post.title}
AUTHOR: u/${post.author}
SCORE: ${post.ai_score}/10
LINK: ${post.url}
--------------------------------------------------
POST:
${post.selftext || "(link post, no body)"}
--------------------------------------------------
MATCHED KEYWORDS:
${post.matched_keywords.join(", ")}
--------------------------------------------------
AI REASONING:
${post.ai_reasoning}
--------------------------------------------------
SUGGESTED COMMENT:
${post.ai_comment || "No comment drafted"}

==================================================`;
}

export async function sendEmailAlert(posts: ScoredPost[]): Promise<void> {
  const recipients = (process.env.EMAIL_RECIPIENTS || "").split(",").map((e) => e.trim()).filter(Boolean);
  if (recipients.length === 0 || !process.env.EMAIL_SENDER) return;

  const subject =
    posts.length === 1
      ? `[ALFRD] r/${posts[0].subreddit} - Score ${posts[0].ai_score}/10: ${posts[0].title.slice(0, 60)}`
      : `[ALFRD] ${posts.length} new high-scoring posts found`;

  const body =
    `ALFRD Reddit Alert - ${posts.length} post(s) scoring above 5\n\n` +
    posts.map(formatPost).join("\n\n");

  const transporter = createTransporter();
  await transporter.sendMail({
    from: process.env.EMAIL_SENDER,
    to: recipients.join(", "),
    subject,
    text: body,
  });

  console.log(`Email sent for ${posts.length} post(s)`);
}
