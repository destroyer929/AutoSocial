def calculate_virality_score(hook: str, caption: str, hook_score: int, rag_examples_used: int) -> int:
    """
    Compute a 0–100 virality score using simple heuristics.
    Assumes hook_score is already on a 0–10 scale.
    """

    score = 0

    words = hook.split()
    hook_len = len(words)
    caption_lines = caption.strip().split("\n")
    caption_line_count = len([l for l in caption_lines if l.strip()])

    # 1) Hook length (ideal: 8–18 words)
    if 8 <= hook_len <= 18:
        score += 20
    elif 6 <= hook_len <= 20:
        score += 10

    # 2) Strong opener patterns
    strong_starts = ("POV:", "When you", "No one told us", "The moment you realize")
    if hook.startswith(strong_starts):
        score += 20

    # 3) Direct address to viewer (you/your)
    lower_hook = hook.lower()
    if " you " in f" {lower_hook} " or " your " in f" {lower_hook} ":
        score += 10

    # 4) Caption structure: max 2 non-empty lines
    if caption_line_count <= 2:
        score += 10

    # 5) Caption engagement: question + social action
    lower_caption = caption.lower()
    if "?" in caption:
        score += 10
    if "tag a" in lower_caption or "share this" in lower_caption or "send this" in lower_caption:
        score += 10

    # 6) Base hook_score (0–10) scaled, capped
    score += min(hook_score * 4, 20)

    # 7) RAG examples used (more context = small bonus)
    score += min(rag_examples_used * 3, 10)

    # Clamp to 0–100
    return max(0, min(score, 100))
