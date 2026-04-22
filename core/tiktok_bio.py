import aiohttp
import re
import asyncio
from .proxies import proxies
import random
from collections import deque

# Store proxy success/failure history for prioritizing proxies
proxy_success_history = {proxy: {"success": 0, "failure": 0} for proxy in proxies}
proxy_queue = deque(proxies)  # Rotatable queue for proxy selection

async def fetch_tiktok_bio(username):
    profile_url = f"https://www.tiktok.com/@{username}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }

    async def try_proxy(proxy, semaphore, session):
        proxy_url = f"http://{proxy}"
        async with semaphore:
            try:
                async with session.get(
                    profile_url,
                    proxy=proxy_url,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    if response.status == 200:
                        text = await response.text()
                        match = re.search(r'"signature":"([^"]*)"', text)
                        if match:
                            proxy_success_history[proxy]["success"] += 1
                            return {"bio": match.group(1), "proxy": proxy}
                        proxy_success_history[proxy]["failure"] += 1
                        return {"bio": None, "proxy": proxy}
                    elif response.status == 429:
                        proxy_success_history[proxy]["failure"] += 1
                        return {"bio": None, "proxy": proxy, "rate_limited": True}
                    else:
                        proxy_success_history[proxy]["failure"] += 1
                        return {"bio": None, "proxy": proxy}
            except (aiohttp.ClientError, asyncio.TimeoutError) as e:
                proxy_success_history[proxy]["failure"] += 1
                return {"bio": None, "proxy": proxy}

    async with aiohttp.ClientSession() as session:
        # Select 4–7 proxies based on success rate and queue position
        num_proxies = random.randint(4, 7)
        sorted_proxies = sorted(
            proxy_success_history.keys(),
            key=lambda p: proxy_success_history[p]["success"] / (proxy_success_history[p]["failure"] + 1),
            reverse=True
        )
        selected_proxies = []
        for _ in range(num_proxies):
            if proxy_queue:
                proxy = proxy_queue.popleft()
                if proxy in sorted_proxies:
                    selected_proxies.append(proxy)
                proxy_queue.append(proxy)  # Rotate back to queue
        selected_proxies = selected_proxies[:num_proxies] or proxies[:num_proxies]

        # Limit concurrency with semaphore
        semaphore = asyncio.Semaphore(num_proxies)
        tasks = [asyncio.create_task(try_proxy(proxy, semaphore, session)) for proxy in selected_proxies]
        rate_limited = False

        # Early termination: Stop as soon as a valid bio is found
        for future in asyncio.as_completed(tasks):
            result = await future
            if result.get("bio"):
                # Cancel remaining tasks
                for task in tasks:
                    if not task.done():
                        task.cancel()
                return result["bio"]
            if result.get("rate_limited"):
                rate_limited = True

        # If rate limited, wait and retry with fewer proxies
        if rate_limited:
            await asyncio.sleep(random.uniform(5, 10))  # Backoff
            num_proxies = max(2, num_proxies - 2)  # Reduce concurrency
            selected_proxies = selected_proxies[:num_proxies] or proxies[:num_proxies]
            tasks = [asyncio.create_task(try_proxy(proxy, semaphore, session)) for proxy in selected_proxies]
            for future in asyncio.as_completed(tasks):
                result = await future
                if result.get("bio"):
                    for task in tasks:
                        if not task.done():
                            task.cancel()
                    return result["bio"]

        return None  # All proxies failed