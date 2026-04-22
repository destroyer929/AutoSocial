import json
import re
from pathlib import Path
from typing import List, Dict, Set

INPUT_FILE = "reels.jsonl"
OUTPUT_FILE = "reels_cleaned.jsonl"

# Generic / low-signal hashtags to drop from hashtags[]
GENERIC_HASHTAGS = {
    "fyp", "foryou", "foryoupage", "explore", "explorepage",
    "viral", "trending", "trendingnow", "reels", "reelitfeelit",
    "insta", "instagram", "shorts", "tiktok", "usa", "america",
}

# Patterns that indicate non-content / credit / disclaimers
CREDITS_PATTERNS = [
    r"^follow\s+@",            # follow @user
    r"^follow\s+for\s+more",   # follow for more
    r"^credits?:",             # Credits:
    r"^credit\s+to",           # credit to
    r"^disclaimer",            # Disclaimer
    r"^subscribe\s+to",        # Subscribe to
]

def is_credit_line(line: str) -> bool:
    line_stripped = line.strip().lower()
    for pat in CREDITS_PATTERNS:
        if re.match(pat, line_stripped):
            return True
    # lines that are only dots or pure hashtags are also non-content
    if not line_stripped:
        return True
    if line_stripped.startswith("#") and " " not in line_stripped:
        return True
    return False

def strip_inline_hashtags(text: str) -> str:
    """
    Remove inline hashtags from caption lines so that
    caption remains pure text and hashtags live only in hashtags[].
    """
    return re.sub(r"(?:\s|^)[#＠][^\s#＠]+", "", text).strip()

def clean_caption(caption: str, max_lines: int = 3) -> str:
    """
    - Remove credit / disclaimer / follow lines.
    - Strip inline hashtags.
    - Keep first 2–3 meaningful lines.
    """
    if not caption:
        return ""
    lines = caption.splitlines()
    cleaned: List[str] = []

    for line in lines:
        if is_credit_line(line):
            continue
        stripped = strip_inline_hashtags(line)
        if not stripped:
            continue
        cleaned.append(stripped)
        if len(cleaned) >= max_lines:
            break

    return "\n".join(cleaned)

def build_hook_from_caption(caption: str) -> str:
    """
    Build a 6–12 word hook from cleaned caption:
    - Take first non-empty line.
    - Split into sentences.
    - If result < 3 words or emoji-only, extend or fall back to neutral hook.
    """
    if not caption:
        return ""

    first_line = ""
    for line in caption.splitlines():
        stripped = line.strip()
        if stripped:
            first_line = stripped
            break

    if not first_line:
        return ""

    # sentence split (simple)
    parts = re.split(r"[.!?]+", first_line)
    base = parts[0].strip() if parts else first_line
    words = base.split()

    # if emoji-only / too short → fallback
    if len(words) < 3:
        # try taking more of the first line
        words = first_line.split()
        if len(words) < 3:
            # final fallback: neutral descriptive hook
            return "This reel is trending on Instagram"

    max_words = 12
    return " ".join(words[:max_words])

def reduce_hashtags(raw_tags: List[str], max_tags: int = 10) -> List[str]:
    """
    - Drop generic tags (#explore, #viral, etc.).
    - Deduplicate while preserving order.
    - Keep at most max_tags.
    """
    if not raw_tags:
        return []

    cleaned = []
    for tag in raw_tags:
        t = tag.strip().lstrip("#")
        if not t:
            continue
        if t.lower() in GENERIC_HASHTAGS:
            continue
        cleaned.append(t)

    seen: Set[str] = set()
    unique = []
    for t in cleaned:
        low = t.lower()
        if low in seen:
            continue
        seen.add(low)
        unique.append(t)

    return unique[:max_tags]

def is_high_signal(record: Dict) -> bool:
    """
    High-signal filter (you can tighten later if needed):
    - Keep if views >= 100_000
    - OR likes >= 10_000
    - OR verified creator + topic present
    """
    views = record.get("views") or 0
    likes = record.get("likes") or 0
    verified = bool(record.get("owner_is_verified"))
    topic = (record.get("topic") or "").strip()

    if views >= 100_000:
        return True
    if likes >= 10_000:
        return True
    if verified and topic:
        return True

    # Optional extra strictness (uncomment if you want):
    # if views < 50_000 and likes < 5_000:
    #     return False

    return False

def build_notes(record: Dict, cleaned_caption: str) -> str:
    """
    Simple auto-notes using topic, caption style and performance.
    """
    parts = []

    topic = (record.get("topic") or "").strip()
    if topic:
        parts.append(topic.lower())

    if cleaned_caption:
        lines = cleaned_caption.count("\n") + 1
        if lines <= 2:
            parts.append("short caption")
        else:
            parts.append("story-style caption")

    views = record.get("views") or 0
    likes = record.get("likes") or 0
    if views >= 1_000_000:
        parts.append("viral views")
    elif views >= 100_000:
        parts.append("high views")

    if likes >= 50_000:
        parts.append("very high likes")
    elif likes >= 10_000:
        parts.append("high likes")

    if record.get("owner_is_verified"):
        parts.append("verified creator")

    return " + ".join(parts)

def normalize_record(raw: Dict) -> Dict:
    """
    Map raw JSONL record → RAG-ready schema.
    """
    cleaned_caption = clean_caption(raw.get("caption") or "")
    hook = build_hook_from_caption(cleaned_caption)

    # extra guard for ultra-short hooks
    if len(hook.split()) < 3:
        words = (cleaned_caption or "").split()
        if words:
            hook = " ".join(words[:12])
        else:
            hook = "This reel is trending on Instagram"

    hashtags = reduce_hashtags(raw.get("hashtags") or [])

    return {
        "topic": (raw.get("topic") or "unknown"),
        "hook": hook,
        "caption": cleaned_caption,
        "hashtags": hashtags,
        "audio": raw.get("audio_song_name") or "",
        "duration": raw.get("duration_seconds") or 0.0,
        "views": raw.get("views") or 0,
        "likes": raw.get("likes") or 0,
        "posted_at": raw.get("taken_at_iso") or "",
        "notes": build_notes(raw, cleaned_caption),
    }

def main():
    in_path = Path(INPUT_FILE)
    out_path = Path(OUTPUT_FILE)

    if not in_path.exists():
        raise FileNotFoundError(f"Input file not found: {in_path}")

    seen_urls: Set[str] = set()
    kept = 0
    total = 0

    with in_path.open("r", encoding="utf-8") as fin, \
         out_path.open("w", encoding="utf-8") as fout:

        for line in fin:
            line = line.strip()
            if not line:
                continue
            total += 1
            raw = json.loads(line)

            # 1) deduplicate by video_url
            url = raw.get("video_url")
            if url:
                if url in seen_urls:
                    continue
                seen_urls.add(url)

            # 2) high-signal filter
            if not is_high_signal(raw):
                continue

            # 3) normalize
            norm = normalize_record(raw)

            # 4) write to output JSONL
            fout.write(json.dumps(norm, ensure_ascii=False) + "\n")
            kept += 1

    print(f"Processed {total} reels, kept {kept} high-signal unique reels.")
    print(f"Cleaned file written to: {out_path}")

if __name__ == "__main__":
    main()
