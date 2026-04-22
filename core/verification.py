# File: core/verification.py
import random
import string
import logging

# --- IMPORT YOUR EXISTING SCRAPERS ---
try:
    from core.youtube_bio import fetch_youtube_bio
    from core.instagram_bio import fetch_instagram_bio
    from core.twitter_bio import fetch_twitter_bio
    from core.tiktok_bio import fetch_tiktok_bio
except ImportError as e:
    print(f"⚠️ Warning: Could not import one or more scrapers. {e}")

logger = logging.getLogger("WebApp")

def generate_verification_code(length=5):
    """Generates a random 5-digit numeric code (e.g., '48291')."""
    return ''.join(random.choices(string.digits, k=length))

async def check_profile_bio(platform, username, code):
    """
    Uses the specific platform scraper to find the code in the bio.
    Returns: (bool: Success, str: Message)
    """
    platform = platform.lower()
    username = username.strip()
    code = code.strip()
    
    bio_text = None
    
    try:
        # --- SELECT THE RIGHT SCRAPER ---
        if platform == "youtube":
            bio_text = await fetch_youtube_bio(username)
        elif platform == "instagram":
            bio_text = await fetch_instagram_bio(username)
        elif platform == "twitter":
            bio_text = await fetch_twitter_bio(username)
        elif platform == "tiktok":
            bio_text = await fetch_tiktok_bio(username)
        else:
            return False, f"Platform '{platform}' is not supported for verification."

        # --- VALIDATE RESULT ---
        if bio_text is None:
            return False, f"Could not fetch bio for @{username}. Profile might be private or unreachable."
        
        if code in bio_text:
            return True, "✅ Code found! Verification successful."
        else:
            return False, f"❌ Code '{code}' not found. Found bio: '{bio_text[:50]}...'"

    except Exception as e:
        logger.error(f"Verification Error on {platform}: {e}")
        return False, f"System error checking bio: {str(e)}"