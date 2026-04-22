def caption_prompt(
    hook: str,
    topic: str,
    audience: str,
    context: str = ""
) -> str:
    return f"""
Below are captions from viral Instagram reels:

{context}

Write an Instagram caption for a Reel.

Hook:
{hook}

Rules:
- Maximum 2 short lines
- First line:
  - Describe a specific, vivid moment related to the topic
  - Use simple, concrete details (time of day, place, small actions)
- Second line:
  - Make the viewer see themselves in that moment
  - Ask ONE clear question
  - AND add a small social action
    (for example: "Tag a friend who gets it", "Share this with someone who needs to see this")
- Direct and conversational tone
- No motivational / life-coach speech
- No emojis
- No hashtags
- Do NOT write "Follow for more" here (CTA is separate)
- Keep it focused on the Topic and Audience below

Topic: {topic}

Audience: {audience}

Return ONLY the caption text (1–2 short lines).
"""
