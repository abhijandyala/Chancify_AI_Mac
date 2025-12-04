"""Reddit API configuration and client factory."""

import os
from typing import Optional

from dotenv import load_dotenv

try:
    import praw  # type: ignore
except ImportError:
    praw = None  # type: ignore


load_dotenv()


def get_reddit_client():
    """Return an authenticated PRAW client using environment variables."""
    if praw is None:
        raise ImportError("praw is required. Install with `pip install praw`.")

    client_id = os.getenv("REDDIT_CLIENT_ID")
    client_secret = os.getenv("REDDIT_CLIENT_SECRET")
    username = os.getenv("REDDIT_USERNAME")
    password = os.getenv("REDDIT_PASSWORD")
    user_agent = os.getenv("REDDIT_USER_AGENT", "ChancifyAI/1.0")

    if not all([client_id, client_secret, username, password]):
        raise ValueError("Missing Reddit credentials in environment variables.")

    return praw.Reddit(
        client_id=client_id,
        client_secret=client_secret,
        username=username,
        password=password,
        user_agent=user_agent,
    )


def get_default_time_filter() -> str:
    return os.getenv("REDDIT_TIME_FILTER", "year")


def get_per_subreddit_limit() -> int:
    try:
        return int(os.getenv("REDDIT_PER_SUBREDDIT_LIMIT", "500"))
    except ValueError:
        return 500

