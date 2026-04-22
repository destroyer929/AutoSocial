from pydantic import BaseModel, Field
from typing import List, Optional, Literal

class ReelRequest(BaseModel):
    topic: str = Field(..., example="mindset motivation")
    audience: str = Field(..., example="young entrepreneurs")
    goal: str = Field(..., example="followers")
    platform: Literal["instagram", "youtube", "tiktok", "twitter"] = Field(
        ..., example="instagram"
    )

class ReelResponse(BaseModel):
    # Common metrics
    hook_score: Optional[float] = None
    virality_score: Optional[float] = None
    rag_examples_used: int = Field(..., example=3)

    # Instagram fields
    hook: Optional[str] = None
    caption: Optional[str] = None
    description: Optional[str] = None
    cta: Optional[str] = None
    hashtags: Optional[List[str]] = None

    # YouTube Shorts fields
    title: Optional[str] = None
    yt_description: Optional[str] = None
    yt_tags: Optional[List[str]] = None

    # TikTok fields
    tiktok_caption: Optional[str] = None
    tiktok_hashtags: Optional[List[str]] = None

    # Twitter / X fields
    tweet_text: Optional[str] = None
    tweet_hashtags: Optional[List[str]] = None
