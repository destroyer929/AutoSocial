import asyncio
import requests
import re
import random
import logging
import psycopg2
import psycopg2.extras
from datetime import datetime, UTC
from core.config import DB_CONFIG
# from core.twitter_bio import fetch_twitter_bio # logic for registration moved to specific endpoints if needed

# Setup Logging
logger = logging.getLogger(__name__)

def get_db_connection():
    return psycopg2.connect(**DB_CONFIG)

# --- UTILITY FUNCTIONS ---

def extract_tweet_id(twitter_url):
    pattern = r"(?:https?:\/\/)?(?:twitter|x)\.com\/\w+\/status\/(\d+)"
    match = re.search(pattern, twitter_url)
    if match:
        return match.group(1)
    else:
        raise ValueError("Invalid Twitter URL. Please provide a valid link.")

def fetch_tweet_data(tweet_id):
    """
    Fetches raw JSON data from Twitter/X GraphQ API.
    Note: This uses 'requests' (synchronous). It should be run in a thread.
    """
    url = (
        "https://x.com/i/api/graphql/b9Yw90FMr_zUb8DvA8r2ug/TweetDetail?"
        f"variables=%7B%22focalTweetId%22%3A%22{tweet_id}%22%2C%22with_rux_injections%22%3Afalse%2C"
        "%22rankingMode%22%3A%22Relevance%22%2C%22includePromotedContent%22%3Atrue%2C"
        "%22withCommunity%22%3Atrue%2C%22withQuickPromoteEligibilityTweetFields%22%3Atrue%2C"
        "%22withBirdwatchNotes%22%3Atrue%2C%22withVoice%22%3Atrue%7D&"
        "features=%7B%22rweb_video_screen_enabled%22%3Afalse%2C%22profile_label_improvements_pcf_label_in_post_enabled%22%3Atrue%2C"
        "%22rweb_tipjar_consumption_enabled%22%3Atrue%2C%22responsive_web_graphql_exclude_directive_enabled%22%3Atrue%2C"
        "%22verified_phone_label_enabled%22%3Atrue%2C%22creator_subscriptions_tweet_preview_api_enabled%22%3Atrue%2C"
        "%22responsive_web_graphql_timeline_navigation_enabled%22%3Atrue%2C"
        "%22responsive_web_graphql_skip_user_profile_image_extensions_enabled%22%3Afalse%2C"
        "%22premium_content_api_read_enabled%22%3Afalse%2C%22communities_web_enable_tweet_community_results_fetch%22%3Atrue%2C"
        "%22c9s_tweet_anatomy_moderator_badge_enabled%22%3Atrue%2C%22responsive_web_grok_analyze_button_fetch_trends_enabled%22%3Afalse%2C"
        "%22responsive_web_grok_analyze_post_followups_enabled%22%3Atrue%2C%22responsive_web_jetfuel_frame%22%3Afalse%2C"
        "%22responsive_web_grok_share_attachment_enabled%22%3Atrue%2C%22articles_preview_enabled%22%3Atrue%2C"
        "%22responsive_web_edit_tweet_api_enabled%22%3Atrue%2C%22graphql_is_translatable_rweb_tweet_is_translatable_enabled%22%3Atrue%2C"
        "%22view_counts_everywhere_api_enabled%22%3Atrue%2C%22longform_notetweets_consumption_enabled%22%3Atrue%2C"
        "%22responsive_web_twitter_article_tweet_consumption_enabled%22%3Atrue%2C%22tweet_awards_web_tipping_enabled%22%3Afalse%2C"
        "%22responsive_web_grok_show_grok_translated_post%22%3Afalse%2C%22responsive_web_grok_analysis_button_from_backend%22%3Atrue%2C"
        "%22creator_subscriptions_quote_tweet_preview_enabled%22%3Afalse%2C%22freedom_of_speech_not_reach_fetch_enabled%22%3Atrue%2C"
        "%22standardized_nudges_misinfo%22%3Atrue%2C%22tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled%22%3Atrue%2C"
        "%22longform_notetweets_rich_text_read_enabled%22%3Atrue%2C%22longform_notetweets_inline_media_enabled%22%3Atrue%2C"
        "%22responsive_web_grok_image_annotation_enabled%22%3Atrue%2C%22responsive_web_enhance_cards_enabled%22%3Afalse%7D&"
        "fieldToggles=%7B%22withArticleRichContentState%22%3Atrue%2C%22withArticlePlainText%22%3Afalse%2C"
        "%22withGrokAnalyze%22%3Afalse%2C%22withDisallowedReplyControls%22%3Afalse%7D"
    )

    headers = {
        "Authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
        "Content-Type": "application/json",
        "Accept": "*/*",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        # Note: Guest tokens/cookies often expire. You may need a rotation system for production.
        "Cookie": 'g_state={"i_l":0}; kdt=4S0dLLZZKzUPoIzFrsIp6bq9HipPQlkc6LiCdxs7; personalization_id="v1_RmzypMgTQkgQpFktaqmNfQ=="; des_opt_in=Y; _ga=GA1.1.369654454.1740465521; _ga_RJGMY4G45L=GS1.1.1740574358.3.0.1740574358.60.0.0; dnt=1; auth_token=d52a8f766eb9248f31b06f2ab97c7a8d4ed2bc23; guest_id=v1%3A174334071391573321; ct0=7514203b24fb8b37ae4f7939353664b9c2f0fd1a77c483ccbc52697bdb3bd566a9a0fdbfc2a32da6bced4804b4392442c43e04fb6f54ebc1f8b380f8aff63cafb4d53b9cafea75c0c2bd5cf8bf74027b; guest_id_ads=v1%3A174334071391573321; guest_id_marketing=v1%3A174334071391573321; twid=u%3D1872900949154697216; auth_multi="1873401924265119744:4979f9a21157c1abe962cb20d6927f7c424d8c1e"; lang=en; __cf_bm=URKReZDJ5EXuFRQD16w5UKoLFWA0tZUEEE7libJv5Y',
        "x-csrf-token": "7514203b24fb8b37ae4f7939353664b9c2f0fd1a77c483ccbc52697bdb3bd566a9a0fdbfc2a32da6bced4804b4392442c43e04fb6f54ebc1f8b380f8aff63cafb4d53b9cafea75c0c2bd5cf8bf74027b"
    }

    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching tweet data: {e}")
        return None

def get_tweet_metrics(tweet_data):
    if not tweet_data:
        return None
    try:
        tweet = tweet_data["data"]["threaded_conversation_with_injections_v2"]["instructions"][0]["entries"][0]["content"]["itemContent"]["tweet_results"]["result"]
        user = tweet["core"]["user_results"]["result"]["legacy"]
        username = user["screen_name"]
        tweet_id = tweet["legacy"]["id_str"]
        standardized_link = f"https://twitter.com/{username}/status/{tweet_id}"
        created_at = datetime.strptime(tweet["legacy"]["created_at"], "%a %b %d %H:%M:%S +0000 %Y").replace(tzinfo=UTC)
        return {
            "standardized_link": standardized_link,
            "username": username,
            "views": int(tweet["views"]["count"]) if "views" in tweet else 0,
            "likes": tweet["legacy"]["favorite_count"],
            "comments": tweet["legacy"]["reply_count"],
            "created_at": created_at
        }
    except (KeyError, IndexError, ValueError) as e:
        logger.error(f"Error parsing tweet data: {e}")
        return None
    
async def get_twitter_video_stats(url):
    try:
        tweet_id = extract_tweet_id(url)
        # Run synchronous requests in a thread to avoid blocking the API
        tweet_data = await asyncio.to_thread(fetch_tweet_data, tweet_id)
        metrics = get_tweet_metrics(tweet_data)
        if not metrics:
            return None
        return {
            "play_count": metrics["views"], 
            "like_count": metrics["likes"],
            "comment_count": metrics["comments"]
        }
    except ValueError as e:
        logger.error(f"Invalid Twitter URL: {e}")
        return None
    except Exception as e:
        logger.error(f"Error fetching Twitter video stats: {e}")
        return None

async def get_registered_twitter_accounts(user_id):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT account_name FROM registered_accounts WHERE user_id = %s AND platform = 'twitter'", (user_id,))
            return [row[0] for row in cur.fetchall()]

async def remove_twitter_account(user_id, handle_name):
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM submitted_shorts WHERE user_id = %s AND platform = 'twitter' AND account_name = %s",
                    (user_id, handle_name)
                )
                cur.execute(
                    "DELETE FROM video_stats WHERE user_id = %s AND platform = 'twitter' AND short_link IN ("
                    "SELECT short_link FROM submitted_shorts WHERE user_id = %s AND platform = 'twitter' AND account_name = %s)",
                    (user_id, user_id, handle_name)
                )
                cur.execute(
                    "DELETE FROM registered_accounts WHERE user_id = %s AND platform = 'twitter' AND account_name = %s",
                    (user_id, handle_name)
                )
                conn.commit()
                return True
    except Exception as e:
        logger.error(f"Error removing Twitter account: {e}")
        return False

# --- MAIN SERVICE FUNCTION ---

async def save_twitter_video(user_id: int, url: str, promotion_id: int = None):
    """
    Main Logic to save a Twitter/X Video.
    Returns: Dict {'status', 'message', 'data'}
    """
    try:
        # 1. Check Settings
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
                cur.execute("SELECT setting_value FROM settings WHERE setting_key = 'submissions_paused'")
                paused = cur.fetchone()[0] == 'true' if cur.rowcount > 0 else False
                if paused:
                    return {"status": "error", "message": "Submissions are currently paused by an admin."}

                # 2. Check Registration
                registered_accounts = await get_registered_twitter_accounts(user_id)
                if not registered_accounts:
                    return {"status": "error", "message": "You must register a Twitter account first (feature pending)."}

                # 3. Parse URL and Fetch Data
                try:
                    tweet_id = extract_tweet_id(url)
                except ValueError as e:
                    return {"status": "error", "message": str(e)}

                # Run synchronous requests in a thread
                tweet_data = await asyncio.to_thread(fetch_tweet_data, tweet_id)
                metrics = get_tweet_metrics(tweet_data)
                
                if not metrics:
                    return {"status": "error", "message": "Failed to fetch tweet data. Check URL or try again later."}

                normalized_url = metrics["standardized_link"]
                username = metrics["username"]
                initial_views = metrics["views"]
                initial_likes = metrics["likes"]
                initial_comments = metrics["comments"]
                created_at = metrics["created_at"]

                # 4. Verify Ownership
                if username.lower() not in [acc.lower() for acc in registered_accounts]:
                    return {"status": "error", "message": f"This video belongs to @{username}, not your registered accounts."}

                # 5. Database Validations
                cur.execute("SELECT * FROM blacklisted_videos WHERE platform = 'twitter' AND video_url = %s", (normalized_url,))
                if cur.fetchone():
                    return {"status": "error", "message": "This video is blacklisted."}

                cur.execute("SELECT short_link FROM submitted_shorts WHERE platform = 'twitter' AND short_link = %s", (normalized_url,))
                if cur.fetchone():
                    return {"status": "error", "message": "This video has already been submitted."}

                # 72hr Rule
                cur.execute("SELECT setting_value FROM settings WHERE setting_key = '72hr_rule'")
                rule_active = cur.fetchone()[0] == 'true' if cur.rowcount > 0 else False
                if rule_active and (datetime.now(UTC) - created_at).total_seconds() > 72 * 3600:
                    return {"status": "error", "message": "This video is older than 72 hours."}

                # Cutoff Date
                cur.execute("SELECT setting_value FROM settings WHERE setting_key = 'cutoff_date'")
                cutoff_date_str = cur.fetchone()[0] if cur.rowcount > 0 else None
                if cutoff_date_str:
                    try:
                        cutoff_date = datetime.strptime(cutoff_date_str, "%d/%m/%Y").replace(tzinfo=UTC)
                        if created_at < cutoff_date:
                            return {"status": "error", "message": f"Video is older than cutoff date ({cutoff_date_str})."}
                    except ValueError:
                        pass # Ignore invalid date format in DB

                # 6. Insert Data
                cur.execute(
                    "INSERT INTO submitted_shorts (user_id, platform, account_name, short_link, upload_time, promotion_id) "
                    "VALUES (%s, %s, %s, %s, %s, %s)",
                    (user_id, "twitter", username, normalized_url, created_at, promotion_id)
                )
                cur.execute(
                    "INSERT INTO submission_log (user_id, platform, video_url, account_name, action, promotion_id) VALUES (%s, %s, %s, %s, %s, %s)",
                    (user_id, "twitter", normalized_url, username, "submitted", promotion_id)
                )
                cur.execute(
                    "INSERT INTO video_stats (user_id, platform, short_link, views, likes, comments, last_updated) "
                    "VALUES (%s, %s, %s, %s, %s, %s, %s) ON CONFLICT (user_id, platform, short_link) DO UPDATE "
                    "SET views = EXCLUDED.views, likes = EXCLUDED.likes, comments = EXCLUDED.comments, last_updated = EXCLUDED.last_updated",
                    (user_id, "twitter", normalized_url, initial_views, initial_likes, initial_comments, datetime.now(UTC))
                )
                conn.commit()

        return {
            "status": "success", 
            "message": "Twitter video submitted successfully!",
            "data": {
                "url": normalized_url,
                "views": initial_views,
                "likes": initial_likes,
                "comments": initial_comments,
                "account": username
            }
        }

    except Exception as e:
        logger.error(f"Unexpected error in save_twitter_video: {e}")
        return {"status": "error", "message": f"System Error: {str(e)}"}


async def update_twitter_stats():
    """Background task to update Twitter stats."""
    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
                cur.execute("SELECT user_id, short_link FROM submitted_shorts WHERE platform = 'twitter'")
                shorts = cur.fetchall()

                updates = []
                for short in shorts:
                    user_id = short["user_id"]
                    short_link = short["short_link"]
                    
                    try:
                        tweet_id = extract_tweet_id(short_link)
                        tweet_data = await asyncio.to_thread(fetch_tweet_data, tweet_id)
                        metrics = get_tweet_metrics(tweet_data)
                        
                        if metrics:
                            # Inner query for current stats
                            with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as inner_cur:
                                inner_cur.execute(
                                    "SELECT views, likes, comments FROM video_stats WHERE user_id = %s AND platform = 'twitter' AND short_link = %s",
                                    (user_id, short_link)
                                )
                                current_stats = inner_cur.fetchone()
                                
                                if (current_stats is None or 
                                    (metrics["views"] >= current_stats["views"] and 
                                     metrics["likes"] >= current_stats["likes"] and 
                                     metrics["comments"] >= current_stats["comments"])):
                                    
                                    updates.append((
                                        user_id, 
                                        short_link, 
                                        metrics["views"], 
                                        metrics["likes"], 
                                        metrics["comments"], 
                                        datetime.now(UTC)
                                    ))
                    except Exception as e:
                        logger.error(f"Failed to update {short_link}: {e}")
                    
                    await asyncio.sleep(random.uniform(1, 2))

                if updates:
                    cur.executemany(
                        "INSERT INTO video_stats (user_id, platform, short_link, views, likes, comments, last_updated) "
                        "VALUES (%s, 'twitter', %s, %s, %s, %s, %s) "
                        "ON CONFLICT (user_id, platform, short_link) DO UPDATE "
                        "SET views = EXCLUDED.views, likes = EXCLUDED.likes, comments = EXCLUDED.comments, last_updated = EXCLUDED.last_updated",
                        updates
                    )
                conn.commit()

    except Exception as e:
        logger.error(f"Error updating Twitter stats: {e}")