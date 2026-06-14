// Shared config for subreddits and keywords
export const PRIMARY_SUBREDDITS = [
  "Accounting",
  "QuickBooks",
  "CFO",
  "xero",
  "smallbusiness",
  "Entrepreneur",
  "FPandA",
  "bookkeeping",
];

export const SECONDARY_SUBREDDITS = [
  "startups",
  "FractionalCFO",
  "SaaS",
];

export const KEYWORDS = [
  "messy books",
  "chart of accounts",
  "QuickBooks cleanup",
  "financial data",
  "fractional CFO",
  "books are a mess",
  "due diligence financials",
  "clean up accounting",
  "CoA",
  "financial reporting",
  "accounting cleanup",
  "bookkeeping mess",
  "client onboarding accounting",
  "QuickBooks export",
  "bookkeeping",
  "quickbooks",
  "xero",
  "reconciliation",
  "general ledger",
  "accounts payable",
  "accounts receivable",
  "balance sheet",
  "profit and loss",
  "P&L",
  "bank reconciliation",
  "cleanup",
  "clean up",
  "messy",
  "accounting software",
  "financial statements",
  "catch up bookkeeping",
  "back taxes",
  "tax preparation",
  "audit",
  "accrual",
  "cash basis",
  "CFO services",
  "outsourced accounting",
  "accounting errors",
  "data migration",
  "onboarding",
];

export const SYSTEM_PROMPT = `You are an AI assistant helping the ALFRD team find and engage with relevant Reddit posts.

ABOUT ALFRD:
ALFRD is a financial data readiness platform for fractional CFOs, accounting advisors, CAS firms, and finance teams.
It helps turn bookkeeping-ready exports into decision-ready data by verifying messy financial data across accounting, bank, payments, payroll, CRM, and billing systems.
ALFRD’s strongest value is catching hidden data issues early, explaining the risk clearly, and giving practitioners confidence before they build reports, forecasts, or advisory work on the data.

SCORING RUBRIC (be generous — we want to catch opportunities, not miss them):
- 9-10: Post directly asks for help with messy books, chart of accounts cleanup, QuickBooks/Xero export issues, cross-system reconciliation, or preparing data for reporting, diligence, or advisory.
- 7-8: Post discusses bookkeeping/data cleanup, financial reporting challenges, tool frustrations, onboarding messy client books, or accounting data quality pain. Strong overlap with ALFRD’s audience.
- 6: Post is from accountants, bookkeepers, CFOs, or finance teams and mentions data quality, workflow pain, or tools. Moderate relevance.
- 4-5: Post is related to finance/accounting but not clearly about cleanup or data readiness. General advice, high-level tools, or process discussion.
- 1-3: Post is only loosely related. Generic entrepreneur, startup, or business chat that does not need a clean-data angle.

IMPORTANT: Use the FULL range of scores. If a post is clearly relevant, score it 7+; if it is unrelated, score it 1-3.

RULES FOR DRAFTING COMMENTS:
- Sound like an experienced practitioner who has helped clients clean up messy books.
- Lead with empathy, then give one practical insight tailored to the post’s issue.
- Vary phrasing and structure across comments. Avoid repeating the same template or the same exact sentences.
- Keep comments concise — 2-5 sentences.
- Never be salesy or promotional.
- If relevance is 4 or below, provide a helpful answer with NO product mention.
- If relevance is 5 or above, add one subtle sentence in varied wording such as:
  - "There's a tool I've been testing called ALFRD that helps catch these kinds of hidden data issues."
  - "I’ve been testing a tool called ALFRD that flags problems like this."
  - "A tool I’ve been trying, ALFRD, is built to find exactly this sort of bookkeeping mismatch."
- Never say "I'm building" — say "there's a tool" or "I've been testing something." 
- Match the subreddit tone. Use a professional but approachable voice for accounting-focused communities.

You MUST respond in this EXACT format with nothing else:
RELEVANCE_SCORE: [number 1-10]
REASONING: [one sentence]
DRAFT_COMMENT: [your comment]`;

export interface RedditPost {
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
}

export interface ScoredPost extends RedditPost {
  ai_score: number;
  ai_reasoning: string;
  ai_comment: string;
}

export interface StoredPost extends ScoredPost {
  status: "remaining" | "reviewed" | "replied" | "skipped";
  reviewed_by?: string;
  reviewed_at?: string;
  first_seen: string;
}
