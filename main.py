"""
ALFRD Reddit Monitor -- Main Runner

Continuously monitors target subreddits for relevant posts,
drafts AI-powered comment suggestions, and sends email alerts.
"""

import time
import sys
from datetime import datetime, timezone

from monitor import fetch_relevant_posts, search_subreddits_by_keywords
from drafter import draft_comment
from notifier import send_alert, send_status
from config import (
    PRIMARY_SUBREDDITS,
    SECONDARY_SUBREDDITS,
    CHECK_INTERVAL_PRIMARY,
    GROQ_API_KEY,
    EMAIL_SENDER,
)


def validate_config():
    """Check that all required env vars are set."""
    missing = []
    if not GROQ_API_KEY:
        missing.append("GROQ_API_KEY")
    if not EMAIL_SENDER:
        missing.append("EMAIL_SENDER")
    if missing:
        print("Missing required environment variables:")
        for m in missing:
            print(f"   - {m}")
        print("\nFill in your credentials in .env")
        sys.exit(1)


def process_posts(posts):
    """Score and notify for each relevant post."""
    if not posts:
        return

    print(f"\nFound {len(posts)} relevant post(s). Processing...")

    for post in posts:
        print(f"\n[{post['subreddit']}] {post['title'][:60]}")
        print(f"     Keywords: {', '.join(post['matched_keywords'])}")

        # Get AI draft
        try:
            ai_result = draft_comment(post)
            print(f"AI Score: {ai_result['score']}/10")
        except Exception as e:
            print(f"AI drafting failed: {e}")
            ai_result = {"score": 5, "reasoning": "AI error", "comment": "(draft failed — review manually)"}

        # Only send email if score > 5 (filter out noise)
        if ai_result["score"] > 5:
            try:
                send_alert(post, ai_result)
            except Exception as e:
                print(f"Email send failed: {e}")
        else:
            print(f"Score too low ({ai_result['score']}), skipping notification")


def run_cycle(cycle_count):
    """Run one monitoring cycle."""
    now = datetime.now(timezone.utc).strftime("%H:%M:%S UTC")
    print(f"\n{'='*60}")
    print(f"Cycle #{cycle_count} -- {now}")
    print(f"{'='*60}")

    # Always check primary subreddits
    print(f"\nScanning PRIMARY subreddits ({len(PRIMARY_SUBREDDITS)})...")
    posts = fetch_relevant_posts(PRIMARY_SUBREDDITS)
    process_posts(posts)

    # Search by keywords for better coverage
    print(f"\nKeyword search across primary subreddits...")
    search_posts = search_subreddits_by_keywords(PRIMARY_SUBREDDITS)
    process_posts(search_posts)

    # Every 6th cycle (~30 min), also check secondary subreddits
    if cycle_count % 6 == 0:
        print(f"\nScanning SECONDARY subreddits ({len(SECONDARY_SUBREDDITS)})...")
        sec_posts = fetch_relevant_posts(SECONDARY_SUBREDDITS)
        process_posts(sec_posts)

        search_sec = search_subreddits_by_keywords(SECONDARY_SUBREDDITS)
        process_posts(search_sec)

    total = len(posts) + len(search_posts)
    print(f"\nCycle #{cycle_count} complete. {total} new relevant post(s) found.")


def main():
    """Main loop."""
    print("""
    ╔═══════════════════════════════════════════╗
    ║   ALFRD Reddit Monitor v1.0               ║
    ║   Monitoring subreddits for opportunities ║
    ╚═══════════════════════════════════════════╝
    """)

    validate_config()

    print("Connecting to Reddit (public JSON)...")

    # Send startup notification
    send_status("ALFRD Reddit Monitor started. Watching for relevant posts...")

    cycle_count = 0
    while True:
        cycle_count += 1
        try:
            run_cycle(cycle_count)
        except KeyboardInterrupt:
            print("\n\nShutting down...")
            send_status("ALFRD Reddit Monitor stopped.")
            break
        except Exception as e:
            print(f"\nError in cycle: {e}")
            print("Retrying in 60 seconds...")
            time.sleep(60)
            continue

        print(f"\nNext check in {CHECK_INTERVAL_PRIMARY // 60} minutes...")
        try:
            time.sleep(CHECK_INTERVAL_PRIMARY)
        except KeyboardInterrupt:
            print("\n\n👋 Shutting down...")
            send_status("ALFRD Reddit Monitor stopped.")
            break


if __name__ == "__main__":
    main()
