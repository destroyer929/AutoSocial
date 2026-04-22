import asyncio
import html
import re
from playwright.async_api import async_playwright

async def fetch_instagram_bio(username):
    """
    Fetch the Instagram bio for a given username using Playwright.
    Returns the bio string or None if an error occurs.
    """
    try:
        url = f"https://www.instagram.com/{username}/"
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto(url, timeout=60000)
            html_source = await page.content()
            await browser.close()
            
            match = re.search(r'&quot;(.*?)&quot;', html_source, re.DOTALL)
            if match:
                return html.unescape(match.group(1))
            return ""
    except Exception as e:
        print(f"Error fetching Instagram bio for {username}: {e}")
        return None
