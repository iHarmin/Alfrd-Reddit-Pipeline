"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface ScoredPost {
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
  ai_score: number;
  ai_reasoning: string;
  ai_comment: string;
  status: "remaining" | "reviewed" | "replied" | "skipped";
  reviewed_by?: string;
  reviewed_at?: string;
  first_seen: string;
}

type StatusFilter = "all" | "remaining" | "reviewed" | "replied" | "skipped";

function timeAgo(utc: number): string {
  const seconds = Math.floor(Date.now() / 1000 - utc);
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function ScoreBadge({ score }: { score: number }) {
  let color = "bg-gray-700 text-gray-300";
  if (score >= 8) color = "bg-green-900 text-green-300 border border-green-700";
  else if (score >= 6)
    color = "bg-yellow-900 text-yellow-300 border border-yellow-700";
  else if (score >= 4)
    color = "bg-orange-900 text-orange-300 border border-orange-700";
  else color = "bg-gray-800 text-gray-400 border border-gray-700";

  return (
    <span className={`${color} px-2.5 py-1 rounded-full text-sm font-bold`}>
      {score}/10
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    remaining: "bg-blue-900 text-blue-300 border-blue-700",
    reviewed: "bg-green-900 text-green-300 border-green-700",
    replied: "bg-purple-900 text-purple-300 border-purple-700",
    skipped: "bg-gray-800 text-gray-400 border-gray-600",
  };
  return (
    <span className={`${colors[status] || colors.remaining} border px-2 py-0.5 rounded text-xs font-medium capitalize`}>
      {status}
    </span>
  );
}

function PostCard({ post, onStatusChange, updating }: { post: ScoredPost; onStatusChange: (id: string, status: ScoredPost["status"]) => void; updating?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const copyComment = () => {
    navigator.clipboard.writeText(post.ai_comment);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 sm:p-5 space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5">
            <span className="text-blue-400 text-xs sm:text-sm font-medium">
              r/{post.subreddit}
            </span>
            <span className="text-gray-600 text-xs sm:text-sm">·</span>
            <span className="text-gray-500 text-xs sm:text-sm">
              u/{post.author}
            </span>
            <span className="text-gray-600 text-xs sm:text-sm">·</span>
            <span className="text-gray-500 text-xs sm:text-sm">
              {timeAgo(post.created_utc)}
            </span>
            <StatusBadge status={post.status} />
          </div>
          <a
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-base sm:text-lg font-semibold text-gray-100 hover:text-blue-400 transition-colors"
          >
            {post.title}
          </a>
        </div>
        <ScoreBadge score={post.ai_score} />
      </div>

      {/* Post body */}
      {post.selftext && (
        <div className="text-gray-400 text-sm leading-relaxed whitespace-pre-wrap">
          {expanded ? post.selftext : post.selftext.slice(0, 300)}
          {post.selftext.length > 300 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-blue-400 ml-1 hover:underline"
            >
              {expanded ? "show less" : "...show more"}
            </button>
          )}
        </div>
      )}

      {/* Keywords */}
      <div className="flex flex-wrap gap-1.5">
        {post.matched_keywords.map((kw) => (
          <span
            key={kw}
            className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded text-xs border border-gray-700"
          >
            {kw}
          </span>
        ))}
      </div>

      {/* AI Reasoning */}
      <div className="text-sm text-gray-500">
        <span className="text-gray-400 font-medium">AI Reasoning:</span>{" "}
        {post.ai_reasoning}
      </div>

      {post.reviewed_by && (
        <div className="text-xs text-gray-400">
          Last updated by <span className="text-gray-100">{post.reviewed_by}</span>
        </div>
      )}

      {/* Draft comment */}
      {post.ai_comment && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-medium text-gray-300">
              Suggested Comment
            </span>
            <button
              onClick={copyComment}
              className="px-2.5 sm:px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm rounded transition-colors"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="text-gray-300 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
            {post.ai_comment}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <div className="flex items-center gap-4 text-sm">
          <a
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
          >
            Open on Reddit
          </a>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {(["reviewed", "replied", "skipped", "remaining"] as const).map((s) => (
            <button
              key={s}
              onClick={() => onStatusChange(post.id, s)}
              disabled={updating}
              className={`px-2 sm:px-2.5 py-1 text-xs rounded font-medium transition-colors capitalize ${
                post.status === s
                  ? "bg-white/10 text-white ring-1 ring-white/20"
                  : "bg-gray-800 text-gray-500 hover:text-gray-300 hover:bg-gray-700"
              } ${updating ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const POLL_INTERVAL = 3 * 60 * 60; // Poll Reddit every 3 hours
const REFRESH_INTERVAL = 5000; // Refresh displayed posts every 5 seconds

export default function Home() {
  const [posts, setPosts] = useState<ScoredPost[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [lastPoll, setLastPoll] = useState<string | null>(null);
  const [newCount, setNewCount] = useState(0);
  const [polling, setPolling] = useState(false);
  const [pollError, setPollError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [minScore, setMinScore] = useState(6);
  const [currentPage, setCurrentPage] = useState(1);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [updatingPostId, setUpdatingPostId] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  // Load stored posts from backend (instant - just reads a file)
  const loadPosts = useCallback(async () => {
    try {
      const res = await fetch("/api/posts", { credentials: "include" });
      if (!res.ok) {
        throw new Error("Unauthorized");
      }
      const data = await res.json();
      if (data.posts) {
        setPosts(data.posts);
      }
    } catch {
      router.replace("/login");
    }
  }, [router]);

  // Poll: fetch + score in one call, then score remaining if any
  const poll = useCallback(async () => {
    setPolling(true);
    setPollError(null);
    try {
      // Full scan: fetches Reddit + scores new posts in one call
      const res = await fetch("/api/scan", { credentials: "include" });
      if (!res.ok) {
        throw new Error("Unauthorized");
      }
      const data = await res.json();
      setLastPoll(data.polled_at);
      if (data.new_posts > 0) {
        setNewCount((prev) => prev + data.new_posts);
      }
      // Score remaining unscored posts if any
      const scoreRes = await fetch("/api/scan?mode=score", { credentials: "include" });
      await scoreRes.json();
      await loadPosts();
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "Unauthorized") {
        router.replace("/login");
      } else {
        setPollError(`Poll failed: ${err instanceof Error ? err.message : "unknown"}`);
      }
    }
    setPolling(false);
  }, [loadPosts, router]);

  useEffect(() => {
    const loadAuth = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (!res.ok) {
          router.replace("/login");
          return;
        }
        const data = await res.json();
        setUser(data.user);
      } catch {
        router.replace("/login");
      } finally {
        setAuthLoading(false);
      }
    };

    loadAuth();
  }, [router]);

  // On mount: load posts after auth is confirmed, then do initial poll
  useEffect(() => {
    if (!user) return;
    loadPosts().then(() => poll());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Auto-refresh posts from storage every 5 seconds
  useEffect(() => {
    if (!user) return;
    refreshTimerRef.current = setInterval(loadPosts, REFRESH_INTERVAL);
    return () => { if (refreshTimerRef.current) clearInterval(refreshTimerRef.current); };
  }, [loadPosts, user]);

  // Auto-poll Reddit every 2 minutes
  useEffect(() => {
    if (!user) return;
    if (!isLive) {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      return;
    }
    pollTimerRef.current = setInterval(() => poll(), POLL_INTERVAL * 1000);
    return () => { if (pollTimerRef.current) clearInterval(pollTimerRef.current); };
  }, [isLive, poll, user]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.replace("/login");
  };

  const updateStatus = async (id: string, status: ScoredPost["status"]) => {
    if (!user) return;
    setStatusError(null);
    const original = posts.find((p) => p.id === id);
    if (!original) return;

    const optimisticPost = {
      ...original,
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.name,
    };

    setPosts((prev) => prev.map((p) => (p.id === id ? optimisticPost : p)));
    setCurrentPage(1);
    setUpdatingPostId(id);

    try {
      const res = await fetch("/api/posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, status }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Unable to update status");
      }

      const data = await res.json();
      if (data.post) {
        setPosts((prev) => prev.map((p) => (p.id === id ? data.post : p)));
      }
      await loadPosts();
      setCurrentPage(1);
    } catch (err: unknown) {
      setStatusError(err instanceof Error ? err.message : "Unable to update status");
      if (original) {
        setPosts((prev) => prev.map((p) => (p.id === id ? original : p)));
      }
      await loadPosts();
    } finally {
      setUpdatingPostId(null);
    }
  };

  const POSTS_PER_PAGE = 10;

  const filteredPosts = posts
    .filter((p) => p.ai_score >= minScore)
    .filter((p) => statusFilter === "all" || p.status === statusFilter)
    .sort((a, b) => b.created_utc - a.created_utc);

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE));
  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * POSTS_PER_PAGE,
    currentPage * POSTS_PER_PAGE
  );

  const scoredPosts = posts.filter((p) => p.ai_score >= minScore);
  const statusCounts = {
    all: scoredPosts.length,
    remaining: scoredPosts.filter((p) => p.status === "remaining").length,
    reviewed: scoredPosts.filter((p) => p.status === "reviewed").length,
    replied: scoredPosts.filter((p) => p.status === "replied").length,
    skipped: scoredPosts.filter((p) => p.status === "skipped").length,
  };

  if (authLoading) {
    return (
      <main className="max-w-4xl mx-auto px-3 sm:px-4 py-8 text-center text-gray-300">
        Loading user session...
      </main>
    );
  }

  if (!user) {
    return (
      <main className="max-w-4xl mx-auto px-3 sm:px-4 py-8 text-center text-gray-300">
        Redirecting to login...
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      {/* Header */}
      <div className="mb-5 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-1">
          <div className="flex items-center gap-2 sm:gap-3">
            <h1 className="text-xl sm:text-3xl font-bold text-white">
              ALFRD Reddit Monitor
            </h1>
            <span className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-xs font-medium ${
              isLive ? "bg-green-900/50 text-green-400 border border-green-800" : "bg-gray-800 text-gray-500 border border-gray-700"
            }`}>
              <span className={`w-2 h-2 rounded-full ${isLive ? "bg-green-400 animate-pulse" : "bg-gray-600"}`} />
              {isLive ? "Live" : "Paused"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
            <span>Signed in as <span className="text-white">{user.name}</span></span>
            <button
              onClick={logout}
              className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
        <p className="text-gray-500 text-sm sm:text-base">
          Real-time monitoring across {posts.length > 0 ? `${posts.length} posts tracked` : "all subreddits"}
        </p>
      </div>

      {/* Controls */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 space-y-3 sm:space-y-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <button
            onClick={() => poll()}
            disabled={polling}
            className="px-4 sm:px-5 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium rounded-lg transition-colors text-sm sm:text-base"
          >
            {polling ? "Refreshing..." : "Refresh Now"}
          </button>

          <button
            onClick={() => setIsLive(!isLive)}
            className={`px-3 sm:px-4 py-2 sm:py-2.5 font-medium rounded-lg transition-colors text-xs sm:text-sm ${
              isLive ? "bg-gray-800 text-gray-400 hover:bg-gray-700" : "bg-green-700 text-white hover:bg-green-600"
            }`}
          >
            {isLive ? "Pause Monitoring" : "Resume Monitoring"}
          </button>

          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-400">
            <span>Min score:</span>
            <select
              value={minScore}
              onChange={(e) => { setMinScore(Number(e.target.value)); setCurrentPage(1); }}
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-300"
            >
              {[6, 7, 8, 9].map((n) => (
                <option key={n} value={n}>
                  {n}+
                </option>
              ))}
            </select>
          </div>

          {newCount > 0 && (
            <span className="text-xs text-green-400 bg-green-900/30 border border-green-800 px-2 py-1 rounded-full">
              +{newCount} new since load
            </span>
          )}
        </div>

        {lastPoll && (
          <div className="text-xs sm:text-sm text-gray-500">
            Last poll: {new Date(lastPoll).toLocaleTimeString()} · Polls every 3 hrs · {filteredPosts.length} of {scoredPosts.length} posts shown
          </div>
        )}

        {/* Error display */}
        {pollError && (
          <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-2 text-sm text-red-400">
            {pollError}
          </div>
        )}
        {statusError && (
          <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-2 text-sm text-red-400">
            {statusError}
          </div>
        )}

        {/* Status filter tabs */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {(["all", "remaining", "reviewed", "replied", "skipped"] as const).map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setCurrentPage(1); }}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm rounded-lg font-medium transition-colors capitalize ${
                statusFilter === s
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300"
              }`}
            >
              {s} ({statusCounts[s]})
            </button>
          ))}
        </div>
      </div>

      {/* Posts */}
      {paginatedPosts.length > 0 && (
        <>
          <div className="space-y-4">
            {paginatedPosts.map((post) => (
              <PostCard key={post.id} post={post} onStatusChange={updateStatus} updating={updatingPostId === post.id} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                    currentPage === page
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300"
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {paginatedPosts.length === 0 && (
        <div className="text-center py-12 sm:py-20 text-gray-500">
          <p className="text-base sm:text-lg mb-2">No posts found matching your criteria</p>
          <p className="text-xs sm:text-sm">
            {isLive ? "Monitoring is active — new posts will appear automatically" : "Monitoring is paused — resume to get new posts"}
          </p>
        </div>
      )}
    </main>
  );
}
