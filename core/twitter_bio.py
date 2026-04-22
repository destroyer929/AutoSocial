import requests
import asyncio

async def fetch_twitter_bio(username):
    url = (
        "https://x.com/i/api/graphql/32pL5BWe9WKeSK1MoPvFQQ/UserByScreenName?"
        f"variables=%7B%22screen_name%22%3A%22{username}%22%7D&"
        "features=%7B%22hidden_profile_subscriptions_enabled%22%3Atrue%2C"
        "%22profile_label_improvements_pcf_label_in_post_enabled%22%3Atrue%2C"
        "%22rweb_tipjar_consumption_enabled%22%3Atrue%2C%22responsive_web_graphql_exclude_directive_enabled%22%3Atrue%2C"
        "%22verified_phone_label_enabled%22%3Atrue%2C%22subscriptions_verification_info_is_identity_verified_enabled%22%3Atrue%2C"
        "%22subscriptions_verification_info_verified_since_enabled%22%3Atrue%2C%22highlights_tweets_tab_ui_enabled%22%3Atrue%2C"
        "%22responsive_web_twitter_article_notes_tab_enabled%22%3Atrue%2C%22subscriptions_feature_can_gift_premium%22%3Atrue%2C"
        "%22creator_subscriptions_tweet_preview_api_enabled%22%3Atrue%2C%22responsive_web_graphql_skip_user_profile_image_extensions_enabled%22%3Afalse%2C"
        "%22responsive_web_graphql_timeline_navigation_enabled%22%3Atrue%7D&"
        "fieldToggles=%7B%22withAuxiliaryUserLabels%22%3Atrue%7D"
    )

    headers = {
        "Authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
        "Content-Type": "application/json",
        "Cookie": 'guest_id_marketing=v1%3A174334064043843603; guest_id_ads=v1%3A174334064043843603; guest_id=v1%3A174334064043843603; d_prefs=MjoxLGNvbnNlbnRfdmVyc2lvbjoyLHRleHRfdmVyc2lvbjoxMDAw; g_state={"i_l":0}; kdt=z4gyl5EIwaoKjx3D1Pir7koR0JVfXS6TUP1eq4jT; auth_token=804245bf4cc28a7b26387aeedc49967c8c0c7e82; ct0=ff0ae2701b1c71c047311ae2670d11aa9cb6fa2177d87dadda734115a8d90185ad0e0a21ab70a4c6c9393abc4aaeee2fbdd962bbbd785de1b21d77e4a86d1368eeadfa2b0921f4672a9b00c877bd5e14; twid=u%3D1873401924265119744; des_opt_in=Y; lang=en; personalization_id="v1_Oy9BB5MlXPg1Zkhod5ofJg=="; __cf_bm=yCBuzUKdIB17o46QVSE6J1IbQ.jOKxrrUuSshCvtqoA-1743848096-1.0.1.1-22qwoZ2sZQmd.duZEPxqtOEViFlmN43G8VS4YuEZxHaQHoxFzcDalhREU7KQlPLkC9DJZ3N7N6SYaWIOH5giQxsX1NyrI0n_wOtDECB6g9I; external_referer=8e8t2xd8A2w%3D|0|Row7tAmsAfIEmjPNOVSmwU7WBxyUUJED%2FJi%2FFP0ccJTUozgUq8A4Vw%3D%3D',
        "x-csrf-token": "ff0ae2701b1c71c047311ae2670d11aa9cb6fa2177d87dadda734115a8d90185ad0e0a21ab70a4c6c9393abc4aaeee2fbdd962bbbd785de1b21d77e4a86d1368eeadfa2b0921f4672a9b00c877bd5e14",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36"
    }

    try:
        # Run synchronous requests.get in a thread to avoid blocking the event loop
        response = await asyncio.to_thread(requests.get, url, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if "data" not in data or "user" not in data["data"] or not data["data"]["user"]:
            print(f"Error: User '{username}' not found on Twitter.")
            return None
        
        user_data = data["data"]["user"]["result"]["legacy"]
        bio = user_data["description"]
        return bio
    except requests.exceptions.RequestException as e:
        print(f"Error fetching user data: {e}")
        return None
    except KeyError:
        print("Error: Could not parse bio from the response data")
        return None