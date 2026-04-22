import random
import asyncio
import logging
import psycopg2
import psycopg2.extras
from datetime import datetime, timedelta, UTC
from googleapiclient.discovery import build
from core.config import YOUTUBE_API_KEY, DB_CONFIG

# Setup Logging
logger = logging.getLogger(__name__)

# Initialize YouTube API
try:
    youtube = build("youtube", "v3", developerKey=YOUTUBE_API_KEY)
except Exception as e:
    logger.error(f"Failed to initialize YouTube API: {e}")
    youtube = None

def get_db_connection():
    return psycopg2.connect(**DB_CONFIG)

# --- UTILITY FUNCTIONS ---

async def get_video_stats(link):
    """Fetch view, like, and comment counts."""
    video_id = extract_video_id(link)
    if not video_id or not youtube:
        return None

    try:
        response = await asyncio.to_thread(
            youtube.videos().list(part="statistics", id=video_id).execute
        )
        if "items" in response and response["items"]:
            stats = response["items"][0]["statistics"]
            return {
                "views": int(stats.get("viewCount", 0)),
                "likes": int(stats.get("likeCount", 0)),
                "comments": int(stats.get("commentCount", 0))
            }
    except Exception as e:
        logger.error(f"Error fetching video stats: {e}")
    return {"views": 0, "likes": 0, "comments": 0}

async def get_video_info(link):
    """Fetch video snippet (title, publishedAt, etc.)."""
    video_id = extract_video_id(link)
    if not video_id or not youtube:
        return None

    try:
        response = await asyncio.to_thread(
            youtube.videos().list(part="snippet", id=video_id).execute
        )
        if "items" in response and response["items"]:
            return response["items"][0]["snippet"]
    except Exception as e:
        logger.error(f"Error fetching video info: {e}")
    return None

def extract_video_id(link):
    """Helper to parse Video ID from various YouTube URL formats."""
    if "youtube.com/shorts/" in link:
        return link.split("youtube.com/shorts/")[1].split("?")[0]
    elif "youtube.com/watch?v=" in link:
        return link.split("watch?v=")[1].split("&")[0]
    elif "youtu.be/" in link:
        return link.split("youtu.be/")[1].split("?")[0]
    return None

async def get_channel_handle_from_link(link):
    """Finds the channel handle (username) of the video uploader."""
    video_id = extract_video_id(link)
    if not video_id or not youtube:
        return None

    try:
        video_response = await asyncio.to_thread(
            youtube.videos().list(part="snippet", id=video_id).execute
        )
        if "items" not in video_response or not video_response["items"]:
            return None
        channel_id = video_response["items"][0]["snippet"]["channelId"]

        channel_response = await asyncio.to_thread(
            youtube.channels().list(part="snippet", id=channel_id).execute
        )
        if "items" in channel_response and channel_response["items"]:
            handle = channel_response["items"][0]["snippet"].get("customUrl", "")
            return handle.lstrip('@') if handle else None
        return None
    except Exception as e:
        logger.error(f"Error fetching channel handle: {e}")
        return None

async def get_registered_youtube_accounts(user_id):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute("SELECT account_name FROM registered_accounts WHERE user_id = %s AND platform = 'youtube'", (user_id,))
            result = cur.fetchall()
            return [row['account_name'] for row in result] if result else []

# --- MAIN SERVICE FUNCTION ---

async def save_youtube_video(user_id: int, link: str, promotion_id: int = None):
    """
    Main Logic to save a YouTube Short.
    Returns: Dict {'status', 'message', 'data'}
    """
    if not youtube:
        return {"status": "error", "message": "YouTube API is not configured."}

    # 1. Check Admin Settings
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT setting_value FROM settings WHERE setting_key = 'submissions_paused'")
            paused = cur.fetchone()[0] == 'true' if cur.rowcount > 0 else False
            if paused:
                return {"status": "error", "message": "Submissions are currently paused by an admin."}

    # 2. Check Registration
    registered_accounts = await get_registered_youtube_accounts(user_id)
    if not registered_accounts:
        return {"status": "error", "message": "You must register a YouTube account first (feature pending)."}

    # 3. Validate URL
    video_id = extract_video_id(link)
    if not video_id:
        return {"status": "error", "message": "Invalid YouTube link."}

    normalized_url = f"https://www.youtube.com/shorts/{video_id}"
    
    # 4. Check Ownership (Handle)
    channel_handle = await get_channel_handle_from_link(link)
    if not channel_handle:
        return {"status": "error", "message": "Unable to retrieve channel information from YouTube API."}

    registered_accounts_lower = [account.lower() for account in registered_accounts]
    if channel_handle.lower() not in registered_accounts_lower:
        return {"status": "error", "message": f"This video belongs to @{channel_handle}, which is not registered to you."}

    # 5. Fetch Upload Date
    video_info = await get_video_info(link)
    if not video_info or 'publishedAt' not in video_info:
        return {"status": "error", "message": "Failed to retrieve video upload date."}
    
    upload_date = datetime.strptime(video_info['publishedAt'], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=UTC)

    # Normalize handle casing based on registration
    for account in registered_accounts:
        if account.lower() == channel_handle.lower():
            channel_handle = account
            break

    # 6. Database Checks
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            # Check Duplicate
            cur.execute(
                "SELECT COUNT(*) FROM submitted_shorts WHERE user_id = %s AND short_link = %s",
                (user_id, normalized_url)
            )
            if cur.fetchone()[0] > 0:
                return {"status": "error", "message": "This short has already been submitted by you."}

            # Check 72hr Rule
            cur.execute("SELECT setting_value FROM settings WHERE setting_key = '72hr_rule'")
            rule_active = cur.fetchone()[0] == 'true' if cur.rowcount > 0 else False
            if rule_active:
                if (datetime.now(UTC) - upload_date) > timedelta(hours=72):
                    return {"status": "error", "message": "This short is older than 72 hours."}

            # Check Cutoff Date
            cur.execute("SELECT setting_value FROM settings WHERE setting_key = 'cutoff_date'")
            cutoff_date_str = cur.fetchone()[0] if cur.rowcount > 0 else None
            if cutoff_date_str:
                try:
                    cutoff_date = datetime.strptime(cutoff_date_str, "%d/%m/%Y").replace(tzinfo=UTC)
                    if upload_date <= cutoff_date:
                        return {"status": "error", "message": "This short is too old based on the cutoff date."}
                except ValueError:
                    logger.warning("Invalid cutoff date format in database.")

            # Insert Data
            stats = await get_video_stats(normalized_url)
            initial_views = stats['views'] if stats else 0
            initial_likes = stats['likes'] if stats else 0
            initial_comments = stats['comments'] if stats else 0

            cur.execute(
                "INSERT INTO submitted_shorts (user_id, platform, account_name, short_link, upload_time, promotion_id) "
                "VALUES (%s, %s, %s, %s, %s, %s)",
                (user_id, "youtube", channel_handle, normalized_url, upload_date, promotion_id)
            )
            cur.execute(
                "INSERT INTO submission_log (user_id, platform, video_url, account_name, action, promotion_id) VALUES (%s, %s, %s, %s, %s, %s)",
                (user_id, "youtube", normalized_url, channel_handle, "submitted", promotion_id)
            )
            cur.execute(
                "INSERT INTO video_stats (user_id, platform, short_link, views, likes, comments, last_updated) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s) ON CONFLICT (user_id, platform, short_link) DO UPDATE "
                "SET views = EXCLUDED.views, likes = EXCLUDED.likes, comments = EXCLUDED.comments, last_updated = EXCLUDED.last_updated",
                (user_id, "youtube", normalized_url, initial_views, initial_likes, initial_comments, datetime.now(UTC))
            )
        conn.commit()

    return {
        "status": "success",
        "message": "YouTube Short successfully submitted!",
        "data": {
            "url": normalized_url,
            "views": initial_views,
            "likes": initial_likes,
            "comments": initial_comments,
            "account": channel_handle
        }
    }

async def update_youtube_stats():
    """Background task to update stats."""
    if not youtube:
        return

    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
                cur.execute("""
                    SELECT DISTINCT user_id, platform, short_link 
                    FROM submitted_shorts 
                    WHERE platform = 'youtube'
                """)
                shorts = cur.fetchall()

                tasks = []
                for short in shorts:
                    user_id = short['user_id']
                    platform = short['platform']
                    short_link = short['short_link']
                    
                    async def fetch_and_update(user_id=user_id, platform=platform, short_link=short_link):
                        try:
                            stats = await get_video_stats(short_link)
                            if not stats: return

                            views = stats.get('views', 0)
                            likes = stats.get('likes', 0)
                            comments = stats.get('comments', 0)
                            last_updated = datetime.now(UTC)

                            cur.execute(
                                "SELECT views, likes, comments FROM video_stats WHERE user_id = %s AND platform = %s AND short_link = %s",
                                (user_id, platform, short_link)
                            )
                            current_stats = cur.fetchone()

                            if (current_stats is None or 
                                (views >= current_stats['views'] and 
                                 likes >= current_stats['likes'] and 
                                 comments >= current_stats['comments'])):
                                cur.execute(
                                    """
                                    INSERT INTO video_stats (user_id, platform, short_link, views, likes, comments, last_updated) 
                                    VALUES (%s, %s, %s, %s, %s, %s, %s) 
                                    ON CONFLICT (user_id, platform, short_link) DO UPDATE SET 
                                        views = EXCLUDED.views, 
                                        likes = EXCLUDED.likes, 
                                        comments = EXCLUDED.comments, 
                                        last_updated = EXCLUDED.last_updated
                                    """,
                                    (user_id, platform, short_link, views, likes, comments, last_updated)
                                )
                                conn.commit()
                        except Exception as e:
                            logger.error(f"Failed to process {short_link}: {e}")

                    tasks.append(fetch_and_update())

                await asyncio.gather(*tasks)

    except Exception as e:
        logger.error(f"Error in YouTube stats update: {e}")