def score_hook(hook: str) -> int:
    """
    Score a hook on a 0–10 scale based on simple heuristics.
    Higher = stronger hook.
    Returns -1 for clearly invalid hooks.
    """
    if not hook:
        return -1

    hook = hook.strip()
    words = hook.split()
    lower = hook.lower()

    score = 0

    # 1) Reject very short or clearly incomplete hooks
    if len(words) < 5:
        return -1

    # 2) Penalize hooks ending badly (dangling prepositions/conjunctions)
    bad_endings = ("by", "with", "and", "to", "for", "of")
    if any(hook.lower().endswith(" " + b) or hook.lower().endswith(b) for b in bad_endings):
        return -1

    # 3) Length sweet spot (ideal 8–18 words)
    if 8 <= len(words) <= 18:
        score += 3
    elif 6 <= len(words) <= 20:
        score += 1

    # 4) Strong opener patterns (POV / moment / when you / no one told us)
    strong_starts = (
        "pov:",
        "when you",
        "no one told us",
        "the moment you realize",
    )
    if any(lower.startswith(s) for s in strong_starts):
        score += 3

    # 5) Direct address / identity (you/your)
    if " you " in f" {lower} " or " your " in f" {lower} ":
        score += 2

    # 6) Curiosity / contrast indicators
    curiosity_tokens = ["?", "until", "then", "but", "suddenly"]
    if any(tok in lower for tok in curiosity_tokens):
        score += 2

    # 7) Power words (generic but useful)
    power_words = ["secret", "never", "stop", "why", "this", "moment"]
    if any(w in lower for w in power_words):
        score += 1

    # Clamp to 0–10
    return max(0, min(score, 10))
