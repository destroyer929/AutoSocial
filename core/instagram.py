import asyncio
import aiohttp
import re
import os
import psycopg2
import psycopg2.extras
import random
import json
import logging
from datetime import datetime, UTC, timedelta
from dotenv import load_dotenv
from urllib.parse import urlparse

from core.config import DB_CONFIG
from core.instagram_bio import fetch_instagram_bio

logger = logging.getLogger(__name__)

load_dotenv(dotenv_path="./cred.env")

USER_AGENT = os.getenv("USER_AGENT")
X_IG_APP_ID = os.getenv("X_IG_APP_ID")

if not USER_AGENT or not X_IG_APP_ID:
    logger.warning(
        "Missing required environment variables: USER_AGENT or X_IG_APP_ID in cred.env"
    )


def get_db_connection():
    return psycopg2.connect(**DB_CONFIG)


# --- UTILITY FUNCTIONS ---


def get_id(url):
    """Extract reel ID from Instagram URL"""
    match = re.search(r"instagram\.com/reel/([a-zA-Z0-9_-]+)", url, re.IGNORECASE)
    return match.group(1) if match else None


async def standardize_instagram_url(url):
    """Clean and validate the URL."""
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(
                url, allow_redirects=True, timeout=aiohttp.ClientTimeout(total=5)
            ) as response:
                final_url = str(response.url)

            if re.search(r"https://www\.instagram\.com/p/[\w-]+/", final_url):
                return {
                    "valid": False,
                    "error": "This is a post link. Please enter a reel link.",
                }

            match = re.search(
                r"(https://www\.instagram\.com/reel/[\w-]+/)", final_url
            )
            if match:
                return {"valid": True, "url": match.group(1)}
            return {
                "valid": False,
                "error": "Invalid Instagram URL or unable to extract standard link.",
            }
        except Exception as e:
            return {"valid": False, "error": f"Request failed: {str(e)}"}


async def get_instagram_graphql_data(url, session):
    """Fetch Instagram reel data via GraphQL API"""
    try:
        ig_id = get_id(url)
        if not ig_id:
            raise ValueError("Invalid Instagram URL")

        graphql_url = "https://www.instagram.com/api/graphql"
        params = {
            "doc_id": "10015901848480474",
            "variables": f'{{"shortcode":"{ig_id}"}}',
            "lsd": "AVqbxe3J_YA",
        }

        headers = {
            "User-Agent": USER_AGENT,
            "Content-Type": "application/x-www-form-urlencoded",
            "X-IG-App-ID": X_IG_APP_ID,
            "X-FB-LSD": "AVqbxe3J_YA",
            "X-ASBD-ID": "129477",
            "Sec-Fetch-Site": "same-origin",
        }

        async with session.post(
            graphql_url, data=params, headers=headers
        ) as response:
            if response.status != 200:
                raise Exception(f"HTTP error! status: {response.status}")

            response_text = await response.text()
            json_data = json.loads(response_text)
            items = json_data.get("data", {}).get("xdt_shortcode_media", None)

            if not items:
                raise ValueError("No media data found in response")

            return {
                "username": items.get("owner", {}).get("username"),
                "url": url,
                "views": items.get("video_play_count", 0),
                "likes": items.get("edge_media_preview_like", {}).get("count", 0),
                "comments": items.get("edge_media_to_comment", {}).get("count", 0),
                "posted_at": datetime.fromtimestamp(
                    items.get("taken_at_timestamp"), UTC
                ),
            }
    except Exception as e:
        logger.error(f"Error fetching Instagram reel data for {url}: {e}")
        return None


async def get_registered_instagram_accounts(web_user_id: int):
    """
    Return list of Instagram account names registered by this web user.
    Uses registered_accounts.web_user_id.
    """
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute(
                """
                SELECT account_name
                FROM registered_accounts
                WHERE web_user_id = %s AND platform = 'instagram'
                """,
                (web_user_id,),
            )
            result = cur.fetchall()
            return [row["account_name"] for row in result] if result else []


# --- MAIN SERVICE FUNCTION ---


async def save_instagram_video(web_user_id: int, url: str, promotion_id: int = None):
    """
    Main logic to save an Instagram Reel.
    Returns: Dict {'status', 'message', 'data'}
    """

    # 1. Check Settings
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT setting_value FROM settings WHERE setting_key = 'submissions_paused'"
            )
            paused = cur.fetchone()[0] == "true" if cur.rowcount > 0 else False
            if paused:
                return {
                    "status": "error",
                    "message": "Submissions are currently paused by an admin.",
                }

    # 2. Check Registration (per web user)
    registered_accounts = await get_registered_instagram_accounts(web_user_id)
    if not registered_accounts:
        return {
            "status": "error",
            "message": "You must register an Instagram account first (feature pending).",
        }

    # 3. Standardize URL
    url_check = await standardize_instagram_url(url)
    if not url_check["valid"]:
        return {"status": "error", "message": url_check["error"]}

    normalized_url = url_check["url"].rstrip("/") + "/"

    # 4. Fetch Data
    async with aiohttp.ClientSession() as session:
        media_info = await get_instagram_graphql_data(normalized_url, session)

        if not media_info:
            return {
                "status": "error",
                "message": "Failed to validate Instagram reel: No media data found.",
            }

        username = media_info["username"]
        upload_date = media_info["posted_at"]

        # 5. Verify Ownership
        registered_accounts_lower = [acc.lower() for acc in registered_accounts]
        if username.lower() not in registered_accounts_lower:
            return {
                "status": "error",
                "message": f"This reel belongs to @{username}, which is not registered to you.",
            }

        # Normalize username casing
        for account in registered_accounts:
            if account.lower() == username.lower():
                username = account
                break

        # 6. Database Validations & Insert
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
                # Check Duplicates (per web user)
                cur.execute(
                    """
                    SELECT COUNT(*) FROM submitted_shorts
                    WHERE user_id = %s AND short_link = %s
                    """,
                    (web_user_id, normalized_url),
                )
                if cur.fetchone()[0] > 0:
                    return {
                        "status": "error",
                        "message": "This reel has already been submitted by you.",
                    }

                # Check 72hr Rule
                cur.execute(
                    "SELECT setting_value FROM settings WHERE setting_key = '72hr_rule'"
                )
                rule_active = cur.fetchone()[0] == "true" if cur.rowcount > 0 else False
                if rule_active:
                    current_time = datetime.now(UTC)
                    if (current_time - upload_date) > timedelta(hours=72):
                        return {
                            "status": "error",
                            "message": "This reel is older than 72 hours.",
                        }

                # Check Blacklist
                cur.execute(
                    """
                    SELECT video_url
                    FROM blacklisted_videos
                    WHERE platform = 'instagram' AND video_url = %s
                    """,
                    (normalized_url,),
                )
                if cur.fetchone():
                    return {
                        "status": "error",
                        "message": "This reel is blacklisted by an admin.",
                    }

                # Insert Submission
                initial_views = media_info["views"]
                initial_likes = media_info["likes"]
                initial_comments = media_info["comments"]

                cur.execute(
                    """
                    INSERT INTO submitted_shorts
                        (user_id, platform, account_name, short_link, upload_time, promotion_id)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (web_user_id, "instagram", username, normalized_url, upload_date, promotion_id),
                )

                cur.execute(
                    """
                    INSERT INTO submission_log (user_id, platform, video_url, account_name, action, promotion_id)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (web_user_id, "instagram", normalized_url, username, "submitted", promotion_id),
                )

                cur.execute(
                    """
                    INSERT INTO video_stats
                        (user_id, platform, short_link, views, likes, comments, last_updated)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (user_id, platform, short_link) DO UPDATE
                    SET views = EXCLUDED.views,
                        likes = EXCLUDED.likes,
                        comments = EXCLUDED.comments,
                        last_updated = EXCLUDED.last_updated
                    """,
                    (
                        web_user_id,
                        "instagram",
                        normalized_url,
                        initial_views,
                        initial_likes,
                        initial_comments,
                        datetime.now(UTC),
                    ),
                )

            conn.commit()

    return {
        "status": "success",
        "message": "Instagram reel successfully submitted!",
        "data": {
            "url": normalized_url,
            "views": initial_views,
            "likes": initial_likes,
            "comments": initial_comments,
            "account": username,
        },
    }


async def update_instagram_stats():
    """Background task to update stats."""
    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
                cur.execute(
                    """
                    SELECT DISTINCT user_id, short_link
                    FROM submitted_shorts
                    WHERE platform = 'instagram'
                    """
                )
                shorts = cur.fetchall()

                updates = []
                batch_size = 10
                async with aiohttp.ClientSession() as session:
                    for i in range(0, len(shorts), batch_size):
                        batch = shorts[i : i + batch_size]
                        tasks = []

                        for short in batch:
                            user_id = short["user_id"]
                            short_link = short["short_link"]

                            cur.execute(
                                """
                                SELECT views, likes, comments
                                FROM video_stats
                                WHERE user_id = %s
                                  AND platform = 'instagram'
                                  AND short_link = %s
                                """,
                                (user_id, short_link),
                            )
                            current_stats = cur.fetchone()

                            async def fetch_and_update(
                                short_link=short_link,
                                user_id=user_id,
                                current_stats=current_stats,
                            ):
                                media_info = await get_instagram_graphql_data(
                                    short_link, session
                                )
                                if media_info:
                                    if (
                                        current_stats is None
                                        or (
                                            media_info["views"]
                                            >= current_stats["views"]
                                            and media_info["likes"]
                                            >= current_stats["likes"]
                                            and media_info["comments"]
                                            >= current_stats["comments"]
                                        )
                                    ):
                                        updates.append(
                                            (
                                                user_id,
                                                short_link,
                                                media_info["views"],
                                                media_info["likes"],
                                                media_info["comments"],
                                                datetime.now(UTC),
                                            )
                                        )

                            tasks.append(fetch_and_update())

                        await asyncio.gather(*tasks)
                        if i + batch_size < len(shorts):
                            await asyncio.sleep(random.uniform(1, 3))

                    if updates:
                        cur.executemany(
                            """
                            INSERT INTO video_stats
                                (user_id, platform, short_link, views, likes, comments, last_updated)
                            VALUES (%s, 'instagram', %s, %s, %s, %s, %s)
                            ON CONFLICT (user_id, platform, short_link)
                            DO UPDATE SET
                                views = EXCLUDED.views,
                                likes = EXCLUDED.likes,
                                comments = EXCLUDED.comments,
                                last_updated = EXCLUDED.last_updated
                            """,
                            updates,
                        )
                    conn.commit()
    except Exception as e:
        logger.error(f"Error updating Instagram stats: {e}")
