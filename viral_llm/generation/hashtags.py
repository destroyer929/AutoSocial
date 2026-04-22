def hashtag_prompt(topic: str, context: str = "") -> str:
    return f"""
Below are hashtags used in viral Instagram reels:

{context}

Generate exactly 5 highly relevant Instagram hashtags for this Reel.

Rules:
- Strongly related to the topic
- Use standard Instagram style:
  - No underscores
  - Multi-word hashtags in CamelCase or PascalCase
- Include:
  - At least 2 broad discovery hashtags related to the topic
  - At least 1 community/identity hashtag
  - Remaining hashtags can be more niche (subtopics, specific problems, or content style)
- No generic filler hashtags like #love #instagood #followme
- No emojis

Topic: {topic}

Return ONLY 5 hashtags in a single line, separated by spaces.
"""
