from googleapiclient.discovery import build
from core.config import YOUTUBE_API_KEY

youtube = build("youtube", "v3", developerKey=YOUTUBE_API_KEY)

async def fetch_youtube_bio(username):
    """
    Fetch the YouTube channel bio (description) for a given username using YouTube API.
    Returns the bio string or None if an error occurs.
    """
    try:
        request = youtube.channels().list(part="snippet", forHandle=username)
        response = request.execute()
        if "items" in response and response["items"]:
            channel = response["items"][0]
            return channel["snippet"].get("description", "")
        return None
    except Exception as e:
        print(f"Error fetching YouTube bio for {username}: {e}")
        return None