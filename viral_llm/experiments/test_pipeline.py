from viral_llm.core.orchestrator import generate_instagram_post

result = generate_instagram_post(
    topic="mindset motivation",
    audience="young entrepreneurs",
    goal="followers"
)

print(result)
