def post_prompt(
    topic: str,
    audience: str,
    goal: str,
    context: str = "",
    platform: str = "instagram",
) -> str:
    base_header = f"""
You are an expert short-form content strategist for {platform.capitalize()}.

Below are real examples of viral Instagram reels:

{context}

Create one high-performing short video content package for this topic and audience.

Topic: {topic}
Audience: {audience}
Goal: {goal}
"""

    if platform == "instagram":
        platform_block = """
OUTPUT FORMAT (JSON):

Return ONLY valid JSON like this:

{
  "hook": "...",
  "caption": "...",
  "description": "...",
  "cta": "...",
  "hashtags": ["...", "...", "...", "...", "..."]
}

Rules:

- Hook:
  - 8–18 words
  - Start with ONE of: "POV:", "When you", "No one told us", "The moment you realize"
  - Clearly mention the topic
  - Add a twist or contrast at the end (e.g., "…until this happens", "…but now everything changes")
  - No emojis

- Caption:
  - Maximum 2 short lines
  - First line: describe a specific, vivid moment related to the topic
  - Second line: identity + ONE clear question + tag/share action
    (e.g., "If that's you, what would you do? Tag a friend who gets it.")
  - Direct and conversational
  - No emojis, no hashtags, no "Follow for more" (CTA is separate)

- Description:
  - 1–2 sentences
  - Clearly describe what happens in the Reel and why it is engaging
  - No hashtags
  - No emojis
  - Do NOT include a CTA or "Follow for more" here

- CTA:
  - 5–10 words
  - Match the goal:
    - If goal is "followers": must use "Follow"
    - If goal is "views" or "reach": must use "Share" or "Send"
    - If goal is "saves": must use "Save"
  - Make it specific to the topic
  - No emojis

- Hashtags:
  - Exactly 5 hashtags
  - Strongly related to the topic
  - No underscores
  - Multi-word tags in CamelCase or PascalCase
  - Include at least:
    - 2 broad discovery hashtags for the topic
    - 1 community/identity hashtag
  - No generic filler like #love #instagood #followme
  - No emojis
"""
    elif platform == "youtube":
        platform_block = """
OUTPUT FORMAT (JSON):

Return ONLY valid JSON like this:

{
  "title": "...",
  "yt_description": "...",
  "yt_tags": ["...", "...", "..."]
}

Rules:

- Title:
  - Short, punchy, and keyword-rich.
  - Ideally under ~60 characters.
  - Clearly describe the main hook or transformation in the Short.

- yt_description:
  - Maximum 500 characters.
  - 1–3 short sentences that explain what the Short is about
    and why someone should watch.
  - At the end of the description, include 1–3 relevant hashtags
    (with #) that match the topic.

- yt_tags:
  - 3–8 keyword-style tags WITHOUT the # symbol.
  - Strongly related to the topic and audience.
  - Mix broad topic tags and more specific, niche tags.
"""
    elif platform == "tiktok":
        platform_block = """
OUTPUT FORMAT (JSON):

Return ONLY valid JSON like this:

{
  "tiktok_caption": "...",
  "tiktok_hashtags": ["...", "...", "..."]
}

Rules:

- tiktok_caption:
  - One short caption line (around 100–200 characters).
  - Direct, conversational TikTok tone.
  - Make it feel like something a real creator would write.
  - No emojis.

- tiktok_hashtags:
  - 3–5 hashtags.
  - Strongly related to the topic and audience.
  - No emojis, no underscores.
  - Mix of:
    - 1–2 broad discovery hashtags.
    - 1–3 niche/community hashtags.
"""
    elif platform == "twitter":
        platform_block = """
OUTPUT FORMAT (JSON):

Return ONLY valid JSON like this:

{
  "tweet_text": "...",
  "tweet_hashtags": ["...", "..."]
}

Rules:

- tweet_text:
  - One tweet-style line for a video post.
  - MUST be 280 characters or less in total, including hashtags.
  - Start with a strong hook, then a very short context or benefit.
  - You may include the hashtags inline with #.

- tweet_hashtags:
  - 1–2 highly relevant hashtags WITHOUT the # symbol.
  - These should match the topic and ideal audience.
"""
    else:
        # Fallback – use Instagram rules if platform is unexpected
        platform_block = """
OUTPUT FORMAT (JSON):

{
  "hook": "...",
  "caption": "...",
  "description": "...",
  "cta": "...",
  "hashtags": ["...", "...", "...", "...", "..."]
}
"""

    return base_header + "\n" + platform_block
