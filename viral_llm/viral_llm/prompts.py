def instagram_prompt(topic, audience, goal, rules):
    return f"""
You are an expert Instagram growth strategist.

INSTAGRAM RULES:
- Hook must be within first {rules['hook_chars']} characters
- Use {rules['hashtags']} hashtags
- Tone: {rules['tone']}
- Emoji allowed: {rules['emoji_allowed']}
- CTA required: {rules['cta_required']}

CONTENT DETAILS:
Topic: {topic}
Audience: {audience}
Goal: {goal}

TASK:
1. Write a strong hook (first line)
2. Write a concise caption (2–4 lines)
3. Add {rules['hashtags']} relevant hashtags
4. Add a clear CTA

FORMAT OUTPUT EXACTLY AS:
HOOK:
CAPTION:
HASHTAGS:
CTA:
"""


def youtube_prompt(topic, audience, goal, rules):
    return f"""
You are an expert YouTube Shorts strategist.

YOUTUBE SHORTS RULES:
- Title max {rules['title_chars']} characters
- Description max {rules['description_chars']} characters
- Include {rules['tags_count']} keyword-style tags
- Tone: {rules['tone']}
- Emoji allowed: {rules['emoji_allowed']}

CONTENT DETAILS:
Topic: {topic}
Audience: {audience}
Goal: {goal}

TASK:
1. Write a compelling, keyword-rich title
2. Write a clear description (1–3 sentences)
3. Provide {rules['tags_count']} relevant tags (no # symbol)

FORMAT OUTPUT EXACTLY AS:
TITLE:
DESCRIPTION:
TAGS:
"""


def tiktok_prompt(topic, audience, goal, rules):
    return f"""
You are an expert TikTok growth strategist.

TIKTOK RULES:
- Caption max {rules['caption_chars']} characters
- Use {rules['hashtags']} hashtags (3–5 recommended)
- Tone: {rules['tone']}
- Emoji allowed: {rules['emoji_allowed']}
- CTA required: {rules['cta_required']}

CONTENT DETAILS:
Topic: {topic}
Audience: {audience}
Goal: {goal}

TASK:
1. Write one short, punchy caption line
2. Add {rules['hashtags']} relevant hashtags

FORMAT OUTPUT EXACTLY AS:
CAPTION:
HASHTAGS:
"""


def twitter_prompt(topic, audience, goal, rules):
    return f"""
You are an expert X (Twitter) strategist.

TWITTER / X RULES:
- Total tweet max {rules['tweet_chars']} characters
- Use {rules['hashtags']} hashtags (1–2 recommended)
- Tone: {rules['tone']}
- Emoji allowed: {rules['emoji_allowed']}
- CTA required: {rules['cta_required']}

CONTENT DETAILS:
Topic: {topic}
Audience: {audience}
Goal: {goal}

TASK:
1. Write one tweet-style line for a video post (hook + micro-caption)
2. Add {rules['hashtags']} relevant hashtags at the end

FORMAT OUTPUT EXACTLY AS:
TWEET:
HASHTAGS:
"""
