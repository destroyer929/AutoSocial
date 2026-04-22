import asyncio
import aiohttp
import os
import re
import json
from datetime import datetime, UTC
from urllib.parse import urlparse
from dotenv import load_dotenv  # pip install python-dotenv

# ====== CONFIG ======
load_dotenv(dotenv_path="./cred.env")

USER_AGENT = os.getenv("USER_AGENT")
X_IG_APP_ID = os.getenv("X_IG_APP_ID")

if not USER_AGENT or not X_IG_APP_ID:
    raise RuntimeError("USER_AGENT or X_IG_APP_ID missing in cred.env")

OUTPUT_FILE = "reels.jsonl"  # JSONL: one reel per line
OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "qwen2.5:7b"  # your local model name


# ====== URL HELPERS ======

def extract_reel_shortcode(url: str) -> str | None:
    try:
        parsed = urlparse(url)
        path = parsed.path
    except Exception:
        return None

    m = re.search(r"/(?:reel|reels|p)/([\w-]+)/?", path, re.IGNORECASE)
    if m:
        return m.group(1)
    return None


async def normalize_instagram_url(url: str, session: aiohttp.ClientSession) -> str | None:
    try:
        async with session.get(url, allow_redirects=True, timeout=aiohttp.ClientTimeout(total=5)) as resp:
            final_url = str(resp.url)
    except Exception:
        final_url = url

    shortcode = extract_reel_shortcode(final_url)
    if not shortcode:
        return None

    return f"https://www.instagram.com/reel/{shortcode}/"


# ====== PARSE REQUIRED FIELDS ======

def parse_required_metadata(media: dict) -> dict:
    owner = media.get("owner", {}) or {}
    caption_edges = media.get("edge_media_to_caption", {}).get("edges", [])
    caption_text = caption_edges[0]["node"].get("text") if caption_edges else ""

    hashtags = re.findall(r"#(\w+)", caption_text) if caption_text else []

    audio = (
        media.get("clips_music_attribution_info")
        or media.get("music_metadata")
        or {}
    )

    taken_ts = media.get("taken_at_timestamp")
    taken_iso = (
        datetime.fromtimestamp(taken_ts, UTC).isoformat()
        if taken_ts
        else None
    )

    return {
        "caption": caption_text,
        "hashtags": hashtags,
        "views": media.get("video_play_count", 0),
        "likes": media.get("edge_media_preview_like", {}).get("count", 0),
        "duration_seconds": media.get("video_duration")
            or media.get("mediaPresentationDuration"),
        "audio_song_name": audio.get("song_name"),
        "audio_artist_name": audio.get("artist_name"),
        "taken_at_timestamp": taken_ts,
        "taken_at_iso": taken_iso,
        "owner_username": owner.get("username"),
        "owner_is_verified": owner.get("is_verified"),
        "comments": media.get("edge_media_to_comment", {}).get("count", 0),
        "audio_audio_type": audio.get("audio_type"),
        "accessibility_caption": media.get("accessibility_caption"),
        "video_url": media.get("video_url"),
        "thumbnail_url": media.get("display_url"),
    }


# ====== BUILD TEXT FOR TOPIC LABELING ======

def build_text_for_topic(meta: dict) -> str:
    parts = []
    if meta.get("caption"):
        parts.append(f"Caption: {meta['caption']}")
    if meta.get("hashtags"):
        parts.append("Hashtags: " + " ".join("#" + h for h in meta["hashtags"]))
    if meta.get("accessibility_caption"):
        parts.append(f"Accessibility: {meta['accessibility_caption']}")
    if meta.get("audio_song_name") or meta.get("audio_artist_name"):
        parts.append(
            f"Audio: {meta.get('audio_song_name') or ''} by {meta.get('audio_artist_name') or ''}"
        )
    return "\n".join(parts)


# ====== CALL OLLAMA (LLM TOPIC LABELING) ======

async def classify_topic_with_ollama(meta: dict, session: aiohttp.ClientSession) -> str:
    """
    Call local Ollama (qwen2.5:7b) to get a precise topic string.[web:99][web:108]
    """
    text = build_text_for_topic(meta)

    prompt = (
        "You are labeling Instagram Reels.\n"
        "Given the caption, hashtags, and metadata below, return ONE short, specific topic "
        "for this reel (3 to 6 words). It should be fine-grained, not broad.\n"
        "Examples:\n"
        "- 'street football trick shot'\n"
        "- 'shoulder workout gym tutorial'\n"
        "- 'valorant ranked clutch highlight'\n"
        "- 'quick vegetarian pasta recipe'\n"
        "Return ONLY the topic text, no quotes, no explanation.\n\n"
        f"REEL DATA:\n{text}\n\n"
        "Topic:"
    )

    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.2
        }
    }

    async with session.post(OLLAMA_URL, json=payload) as resp:
        if resp.status != 200:
            print(f"Ollama error HTTP {resp.status}")
            return "unknown"

        data = await resp.json()
        # Ollama /generate returns {"response": "..."} when stream=False
        topic_raw = data.get("response", "") or ""
        topic = topic_raw.strip().strip('"').strip()
        # fallback
        return topic or "unknown"


# ====== GRAPHQL FETCH ======

async def fetch_reel_metadata(url: str, session: aiohttp.ClientSession) -> dict | None:
    shortcode = extract_reel_shortcode(url)
    if not shortcode:
        return None

    graphql_url = "https://www.instagram.com/api/graphql"
    params = {
        "doc_id": "10015901848480474",
        "variables": json.dumps({"shortcode": shortcode}),
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

    async with session.post(graphql_url, data=params, headers=headers) as resp:
        if resp.status != 200:
            print(f"HTTP {resp.status} for {url}")
            return None
        text = await resp.text()
        data = json.loads(text)

    media = data.get("data", {}).get("xdt_shortcode_media")
    if not media:
        return None

    return parse_required_metadata(media)


# ====== APPEND TO JSONL FILE ======

def append_to_jsonl(record: dict, filename: str = OUTPUT_FILE):
    with open(filename, "a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")


# ====== MAIN ======

async def process_reel_urls(urls: list[str]):
    async with aiohttp.ClientSession() as session:
        for url in urls:
            print(f"\nInput URL: {url}")
            normalized = await normalize_instagram_url(url, session)
            if not normalized:
                print("  -> Not a valid Instagram reel URL.")
                continue

            meta = await fetch_reel_metadata(normalized, session)
            if not meta:
                print("  -> Failed to fetch metadata (private/deleted/blocked or shape changed).")
                continue

            # get fine-grained topic from Ollama
            topic = await classify_topic_with_ollama(meta, session)
            meta["topic"] = topic

            append_to_jsonl(meta)
            print(f"  -> Saved with topic: {topic}")


if __name__ == "__main__":
    print("Enter one or more Instagram Reel links (separated by spaces):")
    line = input().strip()
    links = [x for x in line.split() if x]

    if not links:
        print("No links provided.")
    else:
        asyncio.run(process_reel_urls(links))
