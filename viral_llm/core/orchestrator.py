import json

from viral_llm.viral_llm.call import call_llm
from viral_llm.generation.post_prompt import post_prompt
from viral_llm.scoring.hook_score import score_hook
from viral_llm.analytics.virality_score import calculate_virality_score
from viral_llm.rag.retriever import retrieve_viral_examples


def generate_reel_post(topic: str, audience: str, goal: str, platform: str):
    """
    Unified orchestrator for short-form content:
    - platform: "instagram", "youtube", "tiktok", or "twitter"
    """

    # 1️⃣ Retrieve RAG examples (strings)
    viral_examples = retrieve_viral_examples(topic, k=3)

    # Build RAG context safely (strings, not dicts)
    rag_context = "\n\n".join(f"- Example:\n{ex}" for ex in viral_examples)

    # 2️⃣ Single LLM call with platform-aware prompt
    llm_response = call_llm(
        post_prompt(
            topic=topic,
            audience=audience,
            goal=goal,
            context=rag_context,
            platform=platform,
        )
    )

    # 3️⃣ Parse JSON safely
    try:
        data = json.loads(llm_response)
    except json.JSONDecodeError:
        raise ValueError(f"LLM returned invalid JSON:\n{llm_response}")

    # 4️⃣ Choose a hook-like field per platform for scoring
    if platform == "instagram":
        hook_like = data.get("hook", "")
        caption_like = data.get("caption", "")
    elif platform == "youtube":
        hook_like = data.get("title", "")
        caption_like = data.get("yt_description", "")
    elif platform == "tiktok":
        hook_like = data.get("tiktok_caption", "")
        caption_like = data.get("tiktok_caption", "")
    else:  # "twitter"
        hook_like = data.get("tweet_text", "")
        caption_like = data.get("tweet_text", "")

    # 5️⃣ Hook scoring (0–10)
    raw_hook_score = score_hook(hook_like)
    hook_score = min(round(raw_hook_score * 10), 100)

    # 6️⃣ Virality score (0–100)
    virality_score = calculate_virality_score(
        hook=hook_like,
        caption=caption_like,
        hook_score=raw_hook_score,
        rag_examples_used=len(viral_examples),
    )

    # 7️⃣ Build unified response payload
    #    (platform-specific fields are optional)
    return {
        # Common metrics
        "hook_score": hook_score,
        "virality_score": virality_score,
        "rag_examples_used": len(viral_examples),

        # Instagram fields
        "hook": data.get("hook"),
        "caption": data.get("caption"),
        "description": data.get("description"),
        "cta": data.get("cta"),
        "hashtags": data.get("hashtags"),

        # YouTube Shorts fields
        "title": data.get("title"),
        "yt_description": data.get("yt_description"),
        "yt_tags": data.get("yt_tags"),

        # TikTok fields
        "tiktok_caption": data.get("tiktok_caption"),
        "tiktok_hashtags": data.get("tiktok_hashtags"),

        # Twitter / X fields
        "tweet_text": data.get("tweet_text"),
        "tweet_hashtags": data.get("tweet_hashtags"),
    }
