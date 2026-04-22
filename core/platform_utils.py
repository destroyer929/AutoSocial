from database import get_db_connection

async def is_platform_enabled(platform):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(f"SELECT setting_value FROM settings WHERE setting_key = 'platform_{platform}_enabled'")
            result = cur.fetchone()
            return result[0] == 'true' if result else True

def standardize_instagram_url(url):
    from instagram import standardize_instagram_url as instagram_standardize
    return instagram_standardize(url)