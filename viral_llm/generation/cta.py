def cta_prompt(goal: str, topic: str) -> str:
    return f"""
Write a short Instagram call-to-action (CTA) line for a Reel.

Goal: {goal}
Topic: {topic}

Rules:
- 5–10 words
- Must include exactly one of these verbs, matched to the goal:
  - If the goal is followers: use "Follow"
  - If the goal is saves: use "Save"
  - If the goal is shares or reach: use "Share" or "Send"
- Make the action feel specific to the topic, not generic
  (for example: "Follow for daily {topic} chaos and comfort",
   "Save this for your next {topic} session",
   "Share this with someone obsessed with {topic}")
- No emojis
- Do NOT use the word "CTA"

Return ONLY the CTA line.
"""
