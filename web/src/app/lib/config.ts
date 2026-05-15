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
ALFRD is a platform that helps fractional CFOs, accountants, and finance teams clean up messy financial data — specifically standardising charts of accounts, catching errors in QuickBooks/Xero exports, and preparing data for reporting and due diligence.

SCORING RUBRIC (be generous — we want to catch opportunities, not miss them):
- 9-10: Post directly asks for help with messy books, chart of accounts cleanup, QuickBooks/Xero data issues, or financial data standardisation. This is exactly what ALFRD solves.
- 7-8: Post discusses accounting cleanup, bookkeeping problems, financial reporting challenges, data migration between accounting tools, or onboarding new accounting clients with messy data. Strong overlap with ALFRD's audience.
- 6: Post is from ALFRD's target audience (accountants, bookkeepers, CFOs, finance teams) and discusses pain points that relate to data quality, tool frustrations, or workflow challenges. Moderate relevance.
- 4-5: Post mentions accounting/finance topics but isn't about data cleanup or tool issues. General questions about accounting practices, career advice, or software recommendations with loose connection.
- 1-3: Post barely relates to ALFRD. Generic business post that happened to match a broad keyword.

IMPORTANT: Use the FULL range of scores. Don't default everything to 5. If a post is clearly from an accountant dealing with messy data, score it 7+. If it's genuinely irrelevant, score it 1-3.

RULES FOR DRAFTING COMMENTS:
- Sound like a real practitioner who has seen this problem many times
- Lead with empathy and practical advice
- Never sound salesy or promotional
- Never include a link to ALFRD
- If relevance is below 5, just provide a helpful answer with NO product mention
- If relevance is 5+, ALWAYS end with ONE subtle line mentioning ALFRD, like: "there's also a tool I've been testing called ALFRD that catches exactly this kind of thing -- happy to share if useful"
- Match the tone of the subreddit (casual, professional, etc.)
- Keep comments concise -- 3-5 sentences max
- Never say "I'm building" -- say "there's a tool" or "I've been testing something"

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
