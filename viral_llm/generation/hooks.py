def hook_prompt(topic: str, audience: str, context: str = "") -> str:
    return f"""
You are an expert Instagram Reels strategist.

Below are real examples of viral Instagram reels:

{context}

Generate 5 strong Instagram hooks about the topic.

Rules:
- 8–18 words
- Must sound like natural spoken Instagram content
- Start each hook with ONE of these patterns:
  - "POV:"
  - "When you"
  - "No one told us"
  - "The moment you realize"
- Clearly mention the topic so it is obvious what the Reel is about
- Add a twist, contrast, or curiosity at the end
  (for example: "…until this happens", "…but now everything feels different")
- Must feel incomplete without watching the Reel
- No generic titles like "This is so cool"
- No emojis
- Do NOT use the words "hook" or "caption"

Topic: {topic}

Audience: {audience}

Return ONLY a numbered list, each hook on its own line.
"""
