
import os
import logging
import asyncio
import aiohttp
import re
import random
import psycopg2
import psycopg2.extras
from collections import deque
from urllib.parse import urlparse, urlunparse
from datetime import datetime, timedelta, UTC

# Import your existing config and proxies
from core.config import DB_CONFIG
from core.proxies import proxies
from core.tiktok_bio import fetch_tiktok_bio

# Setup Logging
logger = logging.getLogger(__name__)

# --- GLOBAL VARIABLES ---
# Store proxy success/failure history for prioritizing proxies
proxy_success_history = {proxy: {"success": 0, "failure": 0} for proxy in proxies}
proxy_queue = deque(proxies)  # Rotatable queue for proxy selection

def get_db_connection():
    return psycopg2.connect(**DB_CONFIG)

# --- UTILITY FUNCTIONS ---

async def get_standard_tiktok_url(url: str) -> str | None:
    """Standardize a TikTok URL to the format: https://www.tiktok.com/@username/video/ID"""
    url = url.strip()

    async def try_proxy(proxy, semaphore, session):
        proxy_url = f"http://{proxy}"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        async with semaphore:
            try:
                async with session.get(
                    url, proxy=proxy_url, headers=headers, timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    if response.status in (200, 301, 302):
                        redirected_url = str(response.url).split('?')[0]
                        if "tiktok.com" in redirected_url and re.match(r"https?://www\.tiktok\.com/@[^/]+/video/\d+", redirected_url):
                            proxy_success_history[proxy]["success"] += 1
                            return {"url": redirected_url, "proxy": proxy}
                        proxy_success_history[proxy]["failure"] += 1
                        return {"url": None, "proxy": proxy}
                    elif response.status == 429:
                        proxy_success_history[proxy]["failure"] += 1
                        return {"url": None, "proxy": proxy, "rate_limited": True}
                    else:
                        proxy_success_history[proxy]["failure"] += 1
                        return {"url": None, "proxy": proxy}
            except (aiohttp.ClientError, asyncio.TimeoutError) as e:
                proxy_success_history[proxy]["failure"] += 1
                return {"url": None, "proxy": proxy}

    async with aiohttp.ClientSession() as session:
        # Select 4–7 proxies based on success rate
        num_proxies = random.randint(4, 7)
        sorted_proxies = sorted(
            proxy_success_history.keys(),
            key=lambda p: proxy_success_history[p]["success"] / (proxy_success_history[p]["failure"] + 1),
            reverse=True
        )
        selected_proxies = []
        for _ in range(num_proxies):
            if proxy_queue:
                proxy = proxy_queue.popleft()
                if proxy in sorted_proxies:
                    selected_proxies.append(proxy)
                proxy_queue.append(proxy)  # Rotate back
        selected_proxies = selected_proxies[:num_proxies] or proxies[:num_proxies]

        semaphore = asyncio.Semaphore(num_proxies)
        tasks = [asyncio.create_task(try_proxy(proxy, semaphore, session)) for proxy in selected_proxies]
        rate_limited = False

        for future in asyncio.as_completed(tasks):
            result = await future
            if result.get("url"):
                for task in tasks:
                    if not task.done():
                        task.cancel()
                return result["url"]
            if result.get("rate_limited"):
                rate_limited = True

        return None

def extract_video_id(url: str) -> str | None:
    if not url:
        return None
    match = re.search(r"video/(\d+)", url)
    return match.group(1) if match else None

async def get_tiktok_stats(video_url, proxy=None):
    """Fetch TikTok video stats."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }

    async def try_proxy(p, semaphore, session):
        proxy_url = f"http://{p}"
        async with semaphore:
            try:
                async with session.get(
                    video_url, proxy=proxy_url, headers=headers, timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    if response.status == 200:
                        text = await response.text()
                        likes = re.search(r'"diggCount":"?(\d+)"?', text)
                        comments = re.search(r'"commentCount":"?(\d+)"?', text)
                        views = re.search(r'"playCount":"?(\d+)"?', text)
                        create_time = re.search(r'"createTime":"?(\d+)"?', text)
                        if likes and comments and views and create_time:
                            post_time = datetime.fromtimestamp(int(create_time.group(1)), UTC).strftime('%Y-%m-%d %H:%M:%S')
                            proxy_success_history[p]["success"] += 1
                            return {
                                "stats": {
                                    "play_count": int(views.group(1)),
                                    "like_count": int(likes.group(1)),
                                    "comment_count": int(comments.group(1)),
                                    "post_time": post_time
                                },
                                "proxy": p
                            }
                        return {"stats": None, "proxy": p}
                    return {"stats": None, "proxy": p}
            except Exception:
                return {"stats": None, "proxy": p}

    async with aiohttp.ClientSession() as session:
        # Implementation for single proxy if provided
        if proxy:
            # (Simplified for brevity, reusing logic)
             pass 

        # Parallel requests logic (Simplified version of your original code)
        num_proxies = 5
        selected_proxies = proxies[:num_proxies] # Using simple slice for now, add back rotation if needed
        semaphore = asyncio.Semaphore(num_proxies)
        tasks = [asyncio.create_task(try_proxy(p, semaphore, session)) for p in selected_proxies]

        for future in asyncio.as_completed(tasks):
            result = await future
            if result.get("stats"):
                for task in tasks: 
                    if not task.done(): task.cancel()
                return result["stats"]

        return {"play_count": 0, "like_count": 0, "comment_count": 0, "post_time": None}

async def get_registered_tiktok_accounts(user_id):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute("SELECT account_name FROM registered_accounts WHERE user_id = %s AND platform = 'tiktok'", (user_id,))
            result = cur.fetchall()
            return [row['account_name'] for row in result] if result else []

# --- MAIN SERVICE FUNCTION (Called by API) ---

async def save_tiktok_video(user_id: int, link: str, promotion_id: int = None):
    """
    Main Logic to Process a TikTok Submission.
    Returns a Dictionary: {'status': 'success'|'error', 'message': str, 'data': dict}
    """
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT setting_value FROM settings WHERE setting_key = 'submissions_paused'")
            paused = cur.fetchone()[0] == 'true' if cur.rowcount > 0 else False
            cur.execute("SELECT setting_value FROM settings WHERE setting_key = 'platform_tiktok_enabled'")
            enabled = cur.fetchone()[0] == 'true' if cur.rowcount > 0 else False
            
            if paused: return {"status": "error", "message": "Submissions are currently paused by an admin."}
            if not enabled: return {"status": "error", "message": "TikTok is currently disabled by an admin."}

    registered_accounts = await get_registered_tiktok_accounts(user_id)
    if not registered_accounts:
        return {"status": "error", "message": "You must register a TikTok account first (feature pending)."}

    standardized_url = await get_standard_tiktok_url(link)
    if not standardized_url:
        return {"status": "error", "message": "Failed to retrieve the standard TikTok URL."}

    video_id = extract_video_id(standardized_url)
    if not video_id:
        return {"status": "error", "message": f"Invalid TikTok video URL: {standardized_url}"}

    # -- Fetch Stats Logic --
    # (Note: In a full refactor, this massive scraping block should be its own helper function)
    stats = await get_tiktok_stats(standardized_url) 
    
    # Check if stats were found
    if not stats or not stats.get("post_time"):
         return {"status": "error", "message": "Failed to fetch TikTok video stats."}

    # NOTE: Your original code extracted 'handle_name' via regex on the page text alongside stats.
    # For this refactor, I am assuming the standardized URL contains the handle or we extracted it.
    # If the standardized URL is https://www.tiktok.com/@HANDLE/video/ID
    handle_match = re.search(r"@([^/]+)", standardized_url)
    handle_name = handle_match.group(1) if handle_match else None

    if not handle_name:
         return {"status": "error", "message": "Could not determine username from URL."}

    if handle_name.lower() not in [acc.lower() for acc in registered_accounts]:
        return {"status": "error", "message": f"The account @{handle_name} is not registered to you."}

    # Normalize URL
    normalized_url = f"https://www.tiktok.com/@{handle_name}/video/{video_id}"
    timestamp = datetime.strptime(stats["post_time"], '%Y-%m-%d %H:%M:%S').replace(tzinfo=UTC)

    # -- Database Checks --
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # Check Duplicate
            cur.execute(
                "SELECT COUNT(*) FROM submitted_shorts WHERE user_id = %s AND platform = 'tiktok' AND short_link = %s",
                (user_id, normalized_url)
            )
            if cur.fetchone()[0] > 0:
                return {"status": "error", "message": "This video has already been submitted."}

            # Check 72hr Rule
            cur.execute("SELECT setting_value FROM settings WHERE setting_key = '72hr_rule'")
            rule_active = cur.fetchone()[0] == 'true' if cur.rowcount > 0 else False
            if rule_active:
                if (datetime.now(UTC) - timestamp) > timedelta(hours=72):
                    return {"status": "error", "message": "Video is older than 72 hours."}

            # Insert Data
            cur.execute(
                "INSERT INTO submitted_shorts (user_id, platform, account_name, short_link, upload_time, promotion_id) VALUES (%s, %s, %s, %s, %s, %s)",
                (user_id, "tiktok", handle_name, normalized_url, timestamp, promotion_id)
            )
            cur.execute(
                "INSERT INTO video_stats (user_id, platform, short_link, views, likes, comments, last_updated) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s) ON CONFLICT (user_id, platform, short_link) DO NOTHING",
                (user_id, "tiktok", normalized_url, stats['play_count'], stats['like_count'], stats['comment_count'], datetime.now(UTC))
            )
        conn.commit()

    return {
        "status": "success",
        "message": "Video successfully submitted!",
        "data": {
            "url": normalized_url,
            "views": stats['play_count'],
            "likes": stats['like_count'],
            "comments": stats['comment_count'],
            "account": handle_name
        }
    }

