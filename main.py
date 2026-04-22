import sys
import asyncio
import logging
import uvicorn
import psycopg2
import psycopg2.extras
import random  # Required for generating OTPs
from datetime import datetime, timezone
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from contextlib import asynccontextmanager
import os
from uuid import uuid4
import urllib.parse
from typing import Optional, List, Dict

from fastapi import (
    FastAPI,
    Request,
    Form,
    Depends,
    HTTPException,
    status,
    UploadFile,
    File,
    WebSocket,
    WebSocketDisconnect
)
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.middleware.sessions import SessionMiddleware

from core.config import DB_CONFIG
from core.database import (
    get_db_connection,
    create_app_user,
    get_app_user_by_email,
    verify_password,
    initialize_database,
    verify_user_email,
    set_reset_code,
    reset_password,
    create_campaign,
    list_promotions,
    create_promotion,
    join_promotion,  
)

# --- 📧 EMAIL CONFIGURATION ---
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SENDER_EMAIL = "lambor9866@gmail.com"      # <--- REPLACE THIS
SENDER_PASSWORD = "kxvf xkis zucg tluh"    # <--- REPLACE THIS (Your App Password)


def send_real_email(recipient_email, subject, body):
    try:
        msg = MIMEMultipart()
        msg["From"] = SENDER_EMAIL
        msg["To"] = recipient_email
        msg["Subject"] = subject

        msg.attach(MIMEText(body, "plain"))

        # Connect to Gmail Server
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()  # Secure the connection
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        text = msg.as_string()
        server.sendmail(SENDER_EMAIL, recipient_email, text)
        server.quit()

        print(f"✅ Email sent successfully to {recipient_email}")
        return True
    except Exception as e:
        print(f"❌ Failed to send email: {e}")
        return False


# --- 🟢 LIFESPAN MANAGER ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    if sys.platform.startswith("win"):
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
        logging.info("✅ Windows Event Loop Policy set to Proactor")

    # Initialize DB Tables on Startup
    initialize_database()

    yield


# --- IMPORT SERVICES ---
try:
    from core.verification import generate_verification_code, check_profile_bio
    from core.tiktok import save_tiktok_video
    from core.instagram import save_instagram_video
    from core.twitter import save_twitter_video
    from core.youtube import save_youtube_video
except ImportError as e:
    print(f"⚠️ CRITICAL IMPORT ERROR: {e}")


# --- APP CONFIGURATION ---
app = FastAPI(title="Social Media Automation Dashboard", lifespan=lifespan)

@app.middleware("http")
async def update_last_active(request: Request, call_next):
    if "session" in request.scope:
        user_id = request.session.get("user_id")
        if user_id:
            try:
                with get_db_connection() as conn:
                    with conn.cursor() as cur:
                        cur.execute("UPDATE app_users SET last_active = CURRENT_TIMESTAMP WHERE id = %s", (user_id,))
                        conn.commit()
            except Exception:
                pass
    return await call_next(request)

# 🔐 SESSION MIDDLEWARE
app.add_middleware(SessionMiddleware, secret_key="super-secret-random-key", max_age=2592000) # 30 days persistence

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("WebApp")

# Mount Static & Templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# ==========================================
#        WEBSOCKET MANAGER (ADD THIS HERE)
# ==========================================
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_id: str):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        self.active_connections[room_id].append(websocket)

    def disconnect(self, websocket: WebSocket, room_id: str):
        if room_id in self.active_connections:
            self.active_connections[room_id].remove(websocket)
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]

    async def broadcast(self, message: dict, room_id: str):
        if room_id in self.active_connections:
            for connection in self.active_connections[room_id]:
                await connection.send_json(message)

manager = ConnectionManager()
# ==========================================


# ==========================================
#            HELPER FUNCTIONS
# ==========================================

def get_current_user(request: Request):
    """Returns the web user_id from session or None."""
    return request.session.get("user_id")


def get_registered_accounts(web_user_id: int, platform_filter=None):
    """
    Fetches registered accounts for the logged-in web user.

    IMPORTANT:
    registered_accounts table must have:
        web_user_id BIGINT NOT NULL
        platform VARCHAR
        account_name VARCHAR
    and your Discord/bot user_id, if any, should be in another column
    (e.g. bot_user_id) so they are not mixed.
    """
    accounts = []
    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
                if platform_filter and platform_filter != "all":
                    cur.execute(
                        """
                        SELECT * FROM registered_accounts
                        WHERE web_user_id = %s AND platform ILIKE %s
                        ORDER BY account_name
                        """,
                        (web_user_id, platform_filter),
                    )
                else:
                    cur.execute(
                        """
                        SELECT * FROM registered_accounts
                        WHERE web_user_id = %s
                        ORDER BY account_name
                        """,
                        (web_user_id,),
                    )
                accounts = cur.fetchall()
    except Exception as e:
        logger.error(f"Error fetching accounts: {e}")
    return accounts


# ==========================================
#           AUTH ROUTES (LOGIN/SIGNUP)
# ==========================================

# --- LOGIN PAGE ---
@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    return templates.TemplateResponse(
        "auth/login.html", {"request": request, "message": None}
    )


# --- LOGIN SUBMIT ---
@app.post("/login", response_class=HTMLResponse)
async def login_submit(
    request: Request, email: str = Form(...), password: str = Form(...), remember: Optional[str] = Form(None)
):
    user = get_app_user_by_email(email)

    if user and verify_password(password, user["password_hash"]):
        # 🛑 VERIFICATION CHECK
        if not user["is_verified"]:
            return templates.TemplateResponse(
                "auth/verify_email.html",
                {
                    "request": request,
                    "email": email,
                    "message": "⚠️ Please verify your email first.",
                },
            )

        # ✅ Login Success
        request.session["user_id"] = user["id"]          # web user id
        request.session["email"] = user["email"]
        
        # If 'Remember Me' is NOT checked, the session will expire when the browser closes 
        # (default Starlette behavior if max_age is None).
        # To support true "Remember Me", we'll set a 30-day cookie if checked.
        response = RedirectResponse(url="/", status_code=status.HTTP_303_SEE_OTHER)
        if remember == "on":
            # Note: We set a secondary cookie to signal long-term persistence 
            # Or we can just let the session middleware use its default.
            # In this implementation, we'll ensure the session lasts 30 days.
            pass 
            
        return response

    return templates.TemplateResponse(
        "auth/login.html",
        {
            "request": request,
            "message": "❌ Invalid credentials",
            "is_error": True,
        },
    )


# --- SIGNUP PAGE ---
@app.get("/signup", response_class=HTMLResponse)
async def signup_page(request: Request):
    return templates.TemplateResponse(
        "auth/signup.html", {"request": request, "message": None}
    )


# --- SIGNUP SUBMIT ---
@app.post("/signup", response_class=HTMLResponse)
async def signup_submit(
    request: Request, email: str = Form(...), password: str = Form(...)
):
    if get_app_user_by_email(email):
        return templates.TemplateResponse(
            "auth/signup.html",
            {
                "request": request,
                "message": "⚠️ Email already exists",
                "is_error": True,
            },
        )

    try:
        # Generate 5-digit Verification Code
        code = str(random.randint(10000, 99999))

        # Save to DB
        create_app_user(email, password, code)

        # 📨 SEND REAL EMAIL
        email_body = (
            "Welcome to AutoSocial!\n\n"
            f"Your verification code is: {code}\n\n"
            "Please enter this on the verification page."
        )
        send_real_email(email, "Verify Your AutoSocial Account", email_body)

        return templates.TemplateResponse(
            "auth/verify_email.html",
            {
                "request": request,
                "email": email,
                "message": "✅ Account created! Check your email for the code.",
            },
        )
    except Exception as e:
        logger.error(f"Signup error: {e}")
        return templates.TemplateResponse(
            "auth/signup.html",
            {
                "request": request,
                "message": "Server Error during signup",
                "is_error": True,
            },
        )


# --- VERIFY EMAIL SUBMIT ---
@app.post("/verify-email-submit", response_class=HTMLResponse)
async def verify_email_submit(
    request: Request, email: str = Form(...), code: str = Form(...)
):
    if verify_user_email(email, code):
        user = get_app_user_by_email(email)
        request.session["user_id"] = user["id"]
        request.session["email"] = user["email"]
        return RedirectResponse(
            url="/?success=Email+Verified", status_code=status.HTTP_303_SEE_OTHER
        )
    else:
        return templates.TemplateResponse(
            "auth/verify_email.html",
            {
                "request": request,
                "email": email,
                "message": "❌ Invalid Code",
                "is_error": True,
            },
        )


# --- FORGOT PASSWORD PAGE ---
@app.get("/forgot-password", response_class=HTMLResponse)
async def forgot_password_page(request: Request):
    return templates.TemplateResponse(
        "auth/forgot_password.html", {"request": request}
    )


# --- FORGOT PASSWORD SUBMIT ---
@app.post("/forgot-password", response_class=HTMLResponse)
async def forgot_password_submit(request: Request, email: str = Form(...)):
    user = get_app_user_by_email(email)
    if user:
        code = str(random.randint(10000, 99999))
        set_reset_code(email, code)

        email_body = (
            "Password Reset Request\n\n"
            f"Your password reset code is: {code}\n\n"
            "If you did not request this, please ignore this email."
        )
        send_real_email(email, "Reset Your Password", email_body)

        return templates.TemplateResponse(
            "auth/reset_password.html",
            {
                "request": request,
                "email": email,
                "message": "✅ We sent a reset code to your email.",
            },
        )
    else:
        return templates.TemplateResponse(
            "auth/forgot_password.html",
            {
                "request": request,
                "message": "If that email exists, we sent a code.",
                "is_error": False,
            },
        )


# --- RESET PASSWORD SUBMIT ---
@app.post("/reset-password", response_class=HTMLResponse)
async def reset_password_submit(
    request: Request,
    email: str = Form(...),
    code: str = Form(...),
    new_password: str = Form(...),
):
    if reset_password(email, code, new_password):
        return RedirectResponse(
            url="/login?success=Password+Reset+Successful",
            status_code=status.HTTP_303_SEE_OTHER,
        )
    else:
        return templates.TemplateResponse(
            "auth/reset_password.html",
            {
                "request": request,
                "email": email,
                "message": "❌ Invalid Code",
                "is_error": True,
            },
        )


# --- LOGOUT ---
@app.get("/logout")
async def logout(request: Request):
    request.session.clear()
    return RedirectResponse(url="/login", status_code=status.HTTP_303_SEE_OTHER)


# ==========================================
#             DASHBOARD ROUTES
# ==========================================

# --- 1. HOMEPAGE ---
@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request, platform: str = "all"):
    web_user_id = get_current_user(request)
    if not web_user_id:
        return templates.TemplateResponse("index.html", {"request": request})

    accounts = get_registered_accounts(web_user_id, platform)

    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "user_email": request.session.get("email"),
            "accounts": accounts,
            "current_platform": platform,
            "message": request.query_params.get("success"),
            "new_video_stats": None,
            "verification_needed": False,
        },
    )


# --- 1b. LUXURY PREVIEW ---
@app.get("/luxury", response_class=HTMLResponse)
async def luxury_preview(request: Request):
    return templates.TemplateResponse("luxury_landing.html", {"request": request})


# --- 2. SUBMIT VIDEO ---
@app.post("/submit")
async def process_submission(
    request: Request,
    platform: str = Form(...),
    url: str = Form(...),
    promotion_id: Optional[int] = Form(None),
):
    web_user_id = get_current_user(request)
    if not web_user_id:
        return RedirectResponse(url="/login", status_code=303)

    # Log what is actually being used
    logger.info(f"Processing: WebUser={web_user_id}, Platform={platform}, URL={url}")
    accounts = get_registered_accounts(web_user_id)

    # A0. Ensure user has at least one registered account on this platform
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                logger.info(
                    f"Ownership check: web_user_id={web_user_id}, platform={platform}"
                )
                cur.execute(
                    """
                    SELECT 1 FROM registered_accounts
                    WHERE web_user_id = %s AND platform ILIKE %s
                    """,
                    (web_user_id, platform),
                )
                if not cur.fetchone():
                    msg = "You must register an account on this platform first."
                    if promotion_id:
                        return RedirectResponse(f"/promotions/{promotion_id}?msg={urllib.parse.quote(msg)}&err=1", status_code=303)
                    return templates.TemplateResponse(
                        "index.html",
                        {
                            "request": request,
                            "accounts": accounts,
                            "current_platform": "all",
                            "message": f"⚠️ {msg}",
                            "is_error": True,
                            "new_video_stats": None,
                            "user_email": request.session.get("email"),
                        },
                    )
    except Exception as e:
        logger.error(f"Account ownership check error: {e}")

    # A. Check for Duplicates (per web user)
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT 1 FROM video_stats
                    WHERE short_link = %s AND user_id = %s
                    """,
                    (url, web_user_id),
                )
                if cur.fetchone():
                    msg = "You have already submitted this video."
                    if promotion_id:
                        return RedirectResponse(f"/promotions/{promotion_id}?msg={urllib.parse.quote(msg)}&err=1", status_code=303)
                    return templates.TemplateResponse(
                        "index.html",
                        {
                            "request": request,
                            "accounts": accounts,
                            "current_platform": "all",
                            "message": f"⚠️ {msg}",
                            "is_error": True,
                            "new_video_stats": None,
                            "user_email": request.session.get("email"),
                        },
                    )
    except Exception as db_err:
        logger.error(f"Database Check Error: {db_err}")

    # B. Run the Scraper
    result_data = {}
    try:
        # IMPORTANT: here you pass web_user_id; core.* modules should treat this
        # as the "user_id" in video_stats/submitted_shorts.
        if platform == "tiktok":
            result_data = await save_tiktok_video(web_user_id, url, promotion_id)
        elif platform == "instagram":
            result_data = await save_instagram_video(web_user_id, url, promotion_id)
        elif platform == "twitter":
            result_data = await save_twitter_video(web_user_id, url, promotion_id)
        elif platform == "youtube":
            result_data = await save_youtube_video(web_user_id, url, promotion_id)
        else:
            result_data = {"status": "error", "message": "Platform not supported"}
    except Exception as e:
        logger.error(f"System Error: {e}")
        result_data = {"status": "error", "message": f"Server Error: {str(e)}"}

    is_success = result_data.get("status") == "success"
    
    if promotion_id:
        err_flag = "" if is_success else "&err=1"
        if is_success:
            request.session["new_video_stats"] = result_data.get("data")
        return RedirectResponse(f"/promotions/{promotion_id}?msg={urllib.parse.quote(result_data.get('message', ''))}{err_flag}", status_code=303)

    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "accounts": accounts,
            "current_platform": "all",
            "message": result_data.get("message", ""),
            "is_error": not is_success,
            "new_video_stats": result_data.get("data") if is_success else None,
            "user_email": request.session.get("email"),
        },
    )



# --- 3. REGISTER ACCOUNT ---
@app.post("/register_account")
async def register_new_account(
    request: Request,
    platform: str = Form(...),
    account_name: str = Form(...),
    redirect_to: Optional[str] = Form(None),
):
    web_user_id = get_current_user(request)
    if not web_user_id:
        return RedirectResponse("/login")

    accounts = get_registered_accounts(web_user_id)
    account_name = account_name.replace("@", "").strip()

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # GLOBAL CHECK: Check if ANYONE has registered this account
                cur.execute(
                    """
                    SELECT 1 FROM registered_accounts
                    WHERE platform=%s AND account_name=%s
                    """,
                    (platform, account_name),
                )

                if cur.fetchone():
                    msg = f"Account @{account_name} is already registered by a user on this platform."
                    if redirect_to:
                        return RedirectResponse(f"{redirect_to}?msg={urllib.parse.quote(msg)}&err=1", status_code=303)
                    return templates.TemplateResponse(
                        "index.html",
                        {
                            "request": request,
                            "accounts": accounts,
                            "current_platform": "all",
                            "message": f"⚠️ {msg}",
                            "is_error": True,
                            "user_email": request.session.get("email"),
                        },
                    )

                # Generate Code & Save pending registration (per web user)
                code = generate_verification_code()
                cur.execute(
                    """
                    INSERT INTO pending_registrations (web_user_id, platform, username, verification_code)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (web_user_id, platform)
                    DO UPDATE SET verification_code = EXCLUDED.verification_code,
                                  username = EXCLUDED.username
                    """,
                    (web_user_id, platform, account_name, code),
                )
                conn.commit()

        return templates.TemplateResponse(
            "index.html",
            {
                "request": request,
                "accounts": accounts,
                "current_platform": "all",
                "verification_needed": True,
                "verify_platform": platform,
                "verify_username": account_name,
                "verify_code": code,
                "message": "🔐 Verification Required",
                "user_email": request.session.get("email"),
            },
        )

    except Exception as e:
        logger.error(f"Registration Error: {e}")
        if redirect_to:
            return RedirectResponse(f"{redirect_to}?msg=System+Error&err=1", status_code=303)
        return templates.TemplateResponse(
            "index.html",
            {
                "request": request,
                "accounts": accounts,
                "current_platform": "all",
                "message": f"Error: {str(e)}",
                "is_error": True,
                "user_email": request.session.get("email"),
            },
        )


# --- 4. VERIFY ACCOUNT ---
@app.post("/verify_account")
async def verify_account_submit(
    request: Request,
    platform: str = Form(...),
    username: str = Form(...),
    code: str = Form(...),
):
    web_user_id = get_current_user(request)
    if not web_user_id:
        return RedirectResponse("/login")

    accounts = get_registered_accounts(web_user_id)

    # Run Scraper Check
    is_valid, status_msg = await check_profile_bio(platform, username, code)

    if not is_valid:
        return templates.TemplateResponse(
            "index.html",
            {
                "request": request,
                "accounts": accounts,
                "current_platform": "all",
                "verification_needed": True,
                "verify_platform": platform,
                "verify_username": username,
                "verify_code": code,
                "message": f"❌ {status_msg}",
                "is_error": True,
                "user_email": request.session.get("email"),
            },
        )

    # Save to DB
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO registered_accounts (web_user_id, platform, account_name)
                    VALUES (%s, %s, %s)
                    ON CONFLICT DO NOTHING
                    """,
                    (web_user_id, platform, username),
                )

                cur.execute(
                    """
                    DELETE FROM pending_registrations
                    WHERE web_user_id = %s AND platform = %s
                    """,
                    (web_user_id, platform),
                )
                conn.commit()

        accounts = get_registered_accounts(web_user_id)
        return templates.TemplateResponse(
            "index.html",
            {
                "request": request,
                "accounts": accounts,
                "current_platform": "all",
                "message": f"✅ Success! @{username} has been verified.",
                "is_error": False,
                "user_email": request.session.get("email"),
            },
        )

    except Exception as e:
        logger.error(f"Verify account DB error: {e}")
        return templates.TemplateResponse(
            "index.html",
            {
                "request": request,
                "accounts": accounts,
                "current_platform": "all",
                "message": f"Database Error: {str(e)}",
                "is_error": True,
                "user_email": request.session.get("email"),
            },
        )


# --- 5. DELETE ACCOUNT ---
@app.post("/delete_account")
async def delete_account(request: Request, account_id: int = Form(...)):
    web_user_id = get_current_user(request)
    if not web_user_id:
        return RedirectResponse("/login")

    message = ""
    is_error = False

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Ensure account belongs to this web user before deleting
                cur.execute(
                    """
                    SELECT account_name
                    FROM registered_accounts
                    WHERE id = %s AND web_user_id = %s
                    """,
                    (account_id, web_user_id),
                )
                result = cur.fetchone()

                if result:
                    account_name = result[0]
                    # Cascading delete logic (manual safety) scoped to this web user
                    cur.execute(
                        """
                        DELETE FROM video_stats
                        WHERE short_link IN (
                            SELECT short_link
                            FROM submitted_shorts
                            WHERE account_name = %s AND user_id = %s
                        )
                        """,
                        (account_name, web_user_id),
                    )

                    cur.execute(
                        """
                        DELETE FROM submitted_shorts
                        WHERE account_name = %s AND user_id = %s
                        """,
                        (account_name, web_user_id),
                    )

                    cur.execute(
                        """
                        DELETE FROM registered_accounts
                        WHERE id = %s AND web_user_id = %s
                        """,
                        (account_id, web_user_id),
                    )

                    conn.commit()
                    message = f"✅ Account @{account_name} removed."
                else:
                    message = "⚠️ Account not found or unauthorized."
                    is_error = True

    except Exception as e:
        logger.error(f"Delete Error: {e}")
        message = f"Error deleting account: {str(e)}"
        is_error = True

    accounts = get_registered_accounts(web_user_id)
    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "accounts": accounts,
            "current_platform": "all",
            "message": message,
            "is_error": is_error,
            "user_email": request.session.get("email"),
        },
    )


# --- 6. VIEW HISTORY / STATS ---
@app.get("/stats", response_class=HTMLResponse)
async def view_stats(
    request: Request,
    platform: str = "all",
    account: str = "all",
):
    web_user_id = get_current_user(request)
    if not web_user_id:
        return RedirectResponse("/login")

    processed_stats = []
    all_accounts = []
    total_views = 0

    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
                # Get accounts only for this web user
                if platform == "all":
                    cur.execute(
                        """
                        SELECT DISTINCT account_name
                        FROM registered_accounts
                        WHERE web_user_id = %s
                        ORDER BY account_name
                        """,
                        (web_user_id,),
                    )
                else:
                    cur.execute(
                        """
                        SELECT DISTINCT account_name
                        FROM registered_accounts
                        WHERE web_user_id = %s AND platform ILIKE %s
                        ORDER BY account_name
                        """,
                        (web_user_id, platform),
                    )
                all_accounts = [row[0] for row in cur.fetchall()]

                # Build Stats Query (Restricted to web user)
                sql_query = """
                    SELECT
                        v.platform,
                        v.short_link,
                        v.views,
                        v.likes,
                        v.comments,
                        v.last_updated,
                        s.account_name
                    FROM video_stats v
                    LEFT JOIN submitted_shorts s
                        ON v.short_link = s.short_link
                    WHERE v.user_id = %s
                """
                params = [web_user_id]

                if platform != "all":
                    sql_query += " AND v.platform ILIKE %s"
                    params.append(platform)

                if account != "all":
                    sql_query += " AND s.account_name = %s"
                    params.append(account)

                sql_query += " ORDER BY v.last_updated DESC LIMIT 100"

                cur.execute(sql_query, tuple(params))
                rows = cur.fetchall()

                for row in rows:
                    processed_stats.append(
                        {
                            "platform": row["platform"],
                            "url": row["short_link"],
                            "views": row["views"],
                            "likes": row["likes"],
                            "comments": row["comments"],
                            "timestamp": row["last_updated"],
                            "account_name": row["account_name"]
                            if row["account_name"]
                            else "—",
                        }
                    )

                total_views = sum(r["views"] for r in rows)

    except Exception as e:
        logger.error(f"Error fetching stats: {e}")

    return templates.TemplateResponse(
        "stats.html",
        {
            "request": request,
            "stats": processed_stats,
            "all_accounts": all_accounts,
            "current_platform": platform,
            "current_account": account,
            "user_email": request.session.get("email"),
            "total_views": total_views,
        },
    )


@app.post("/stats/delete")
async def delete_stat(
    request: Request,
    url: str = Form(...),
    platform: str = Form(...),
    redirect_to: Optional[str] = Form(None),
):
    web_user_id = get_current_user(request)
    if not web_user_id:
        return RedirectResponse(
            "/login", status_code=status.HTTP_303_SEE_OTHER
        )

    logger.info(f"🗑 Delete request: web_user_id={web_user_id}, platform={platform}, url={url}")

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    DELETE FROM video_stats
                    WHERE user_id = %s
                      AND platform = %s
                      AND short_link = %s
                    """,
                    (web_user_id, platform, url),
                )
                logger.info(f"Rows deleted from video_stats: {cur.rowcount}")

                cur.execute(
                    """
                    DELETE FROM submitted_shorts
                    WHERE user_id = %s
                      AND platform = %s
                      AND short_link = %s
                    """,
                    (web_user_id, platform, url),
                )
                logger.info(f"Rows deleted from submitted_shorts: {cur.rowcount}")

                conn.commit()
    except Exception as e:
        logger.error(f"Delete Error: {e}")

    if redirect_to:
        return RedirectResponse(
            url=redirect_to,
            status_code=status.HTTP_303_SEE_OTHER,
        )
        
    return RedirectResponse(
        url=f"/stats?platform={platform}&account=all",
        status_code=status.HTTP_303_SEE_OTHER,
    )


# --- LLM PART ---
from viral_llm.core.schemas import ReelRequest, ReelResponse
from viral_llm.core.orchestrator import generate_reel_post


@app.post("/instagram", response_model=ReelResponse)
async def instagram_llm(data: ReelRequest):
    return generate_reel_post(
        topic=data.topic,
        audience=data.audience,
        goal=data.goal,
        platform=data.platform,
    )


# --- CAMPAIGNS ---
@app.post("/campaigns/create")
async def create_campaign_route(
    request: Request,
    title: str = Form(...),
    description: str = Form(None),
    platform_mode: str = Form("all"),
    platforms: list[str] = Form([]),
    campaign_type: str = Form(...),
    budget: float = Form(0),          # <-- new field
    image: UploadFile = File(None),
):
    web_user_id = get_current_user(request)
    if not web_user_id:
        return RedirectResponse(url="/login", status_code=status.HTTP_303_SEE_OTHER)

    image_path = None
    if image is not None and image.filename:
        import os
        upload_dir = "static/uploads/campaigns"
        os.makedirs(upload_dir, exist_ok=True)
        ext = os.path.splitext(image.filename)[1]
        fname = f"campaign_{web_user_id}_{int(datetime.now().timestamp())}{ext}"
        full_path = os.path.join(upload_dir, fname)
        with open(full_path, "wb") as f:
            f.write(await image.read())
        image_path = f"/static/uploads/campaigns/{fname}"

    # platforms string
    if platform_mode == "all" or not platforms:
        platforms_str = "all"
    else:
        platforms_str = ",".join(sorted(set(platforms)))

    # 1) create campaign
    campaign_id = create_campaign(
        user_id=web_user_id,
        title=title,
        description=description,
        image_path=image_path,
        platforms=platforms_str,
        campaign_type=campaign_type,
        budget=budget,          # <-- pass budget
    )

    # 2) create default promotion so it shows in /promotions
    create_promotion(
        campaign_id=campaign_id,
        created_by=web_user_id,
        name=title,
        details=description,
        platform=None,         # or "all"
        is_active=True,
    )

    return RedirectResponse(
        url="/?success=Campaign+created+successfully",
        status_code=status.HTTP_303_SEE_OTHER,
    )



# --- MY PROMOTIONS PAGE ---
@app.get("/my-promotions", response_class=HTMLResponse)
async def my_promotions_page(request: Request):
    user_id = get_current_user(request)
    if not user_id:
        return RedirectResponse("/login", status_code=status.HTTP_303_SEE_OTHER)

    created_promos = []
    joined_promos = []

    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
                cur.execute("""
                    SELECT p.*, c.title AS campaign_title, c.image_path AS image_path,
                           c.platforms AS platforms, c.campaign_type AS campaign_type, c.budget AS budget
                    FROM promotions p
                    JOIN campaigns c ON p.campaign_id = c.id
                    WHERE p.created_by = %s
                    ORDER BY p.id DESC
                """, (user_id,))
                for row in cur.fetchall():
                    created_promos.append(dict(row))

                cur.execute("""
                    SELECT p.*, c.title AS campaign_title, c.image_path AS image_path,
                           c.platforms AS platforms, c.campaign_type AS campaign_type, c.budget AS budget
                    FROM promotion_joins pj
                    JOIN promotions p ON pj.promotion_id = p.id
                    JOIN campaigns c ON p.campaign_id = c.id
                    WHERE pj.user_id = %s AND p.created_by != %s
                    ORDER BY pj.joined_at DESC
                """, (user_id, user_id))
                for row in cur.fetchall():
                    joined_promos.append(dict(row))
    except Exception as e:
        logger.error(f"Error fetching my-promotions: {e}")

    return templates.TemplateResponse(
        "my-promotions.html",
        {
            "request": request,
            "user_email": request.session.get("email"),
            "created_promos": created_promos,
            "joined_promos": joined_promos,
            "message": request.query_params.get("msg"),
            "is_error": request.query_params.get("err") == "1",
        },
    )


# --- PROMOTIONS PAGE ---
@app.get("/promotions", response_class=HTMLResponse)
async def promotions_page(request: Request, q: str = None):
    web_user_id = get_current_user(request)
    if not web_user_id:
        return RedirectResponse(
            url="/login", status_code=status.HTTP_303_SEE_OTHER
        )

    promos = list_promotions(search=q)

    return templates.TemplateResponse(
        "promotions.html",
        {
            "request": request,
            "user_email": request.session.get("email"),
            "promotions": promos,
            "search_query": q or "",
        },
    )

# =============================================
# ADD THESE TWO ROUTES TO main.py
# =============================================

# --- PROMOTION DETAIL PAGE ---
@app.get("/promotions/{promotion_id}", response_class=HTMLResponse)
async def promotion_detail_page(request: Request, promotion_id: int):
    user_id = get_current_user(request)
    user_email = request.session.get("email", "")
    if not user_id:
        return RedirectResponse("/login", status_code=status.HTTP_303_SEE_OTHER)

    promotion = None
    already_joined = False
    join_count = 0
    is_admin = False
    support_tickets = []  # Tickets the user created
    manage_tickets = []   # ALL tickets (only visible if admin)

    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:

                # 1. Fetch promotion data
                cur.execute("""
                    SELECT p.*, c.title AS campaign_title, c.image_path AS image_path,
                           c.platforms AS platforms, c.campaign_type AS campaign_type, c.budget AS budget
                    FROM promotions p
                    JOIN campaigns c ON p.campaign_id = c.id
                    WHERE p.id = %s
                """, (promotion_id,))
                promotion = cur.fetchone()

                if not promotion:
                    return RedirectResponse("/promotions?error=Promotion+not+found", status_code=status.HTTP_303_SEE_OTHER)

                # Check if current user is the Admin/Creator of this promotion
                is_admin = (promotion["created_by"] == user_id)

                # 2. Check if current user already joined
                cur.execute("SELECT 1 FROM promotion_joins WHERE promotion_id = %s AND user_id = %s", (promotion_id, user_id))
                already_joined = cur.fetchone() is not None

                # 3. Count total joiners
                cur.execute("SELECT COUNT(*) FROM promotion_joins WHERE promotion_id = %s", (promotion_id,))
                join_count = cur.fetchone()[0]

                # 3.5 Fetch joined members usernames and segments
                cur.execute("""
                    SELECT u.id, u.email, u.last_active, pj.is_admin
                    FROM promotion_joins pj 
                    JOIN app_users u ON pj.user_id = u.id 
                    WHERE pj.promotion_id = %s AND pj.is_removed = FALSE AND pj.is_banned = FALSE
                """, (promotion_id,))
                
                online_members = []
                offline_members = []
                now = datetime.now(timezone.utc)
                join_admin = False

                for row in cur.fetchall():
                    is_member_owner = row["id"] == promotion["created_by"]
                    member_data = {
                        "id": row["id"],
                        "name": row["email"].split("@")[0],
                        "is_admin": is_member_owner or row["is_admin"],
                        "is_owner": is_member_owner
                    }
                    if row["id"] == user_id and row["is_admin"]:
                        join_admin = True
                    
                    if row["last_active"] and (now - row["last_active"]).total_seconds() < 300:
                        online_members.append(member_data)
                    else:
                        offline_members.append(member_data)

                # Update Admin flag if promoted locally
                if join_admin:
                    is_admin = True

                # X. Fetch Announcements (Exclude dismissed)
                announcements_data = []
                unread_count = 0
                cur.execute("""
                    SELECT a.*, (SELECT email FROM app_users WHERE id = a.author_id) as author_email,
                           CASE WHEN r.read_at IS NOT NULL THEN TRUE ELSE FALSE END as is_read
                    FROM announcements a
                    LEFT JOIN announcement_reads r ON a.id = r.announcement_id AND r.user_id = %s
                    WHERE a.promotion_id = %s 
                    AND (r.is_dismissed IS NULL OR r.is_dismissed = FALSE)
                    ORDER BY a.created_at DESC
                """, (user_id, promotion_id))
                
                for row in cur.fetchall():
                    item = dict(row)
                    item['created_at_fmt'] = item['created_at'].strftime('%d %b %Y, %H:%M') if item['created_at'] else ''
                    announcements_data.append(item)
                    if not item['is_read'] and item['author_id'] != user_id:
                        unread_count += 1

                # 4. Fetch User's OWN Support Tickets (For standard 'Support' tab)
                cur.execute("""
                    SELECT t.*,
                           (SELECT message FROM ticket_messages m WHERE m.ticket_id = t.id ORDER BY m.created_at DESC LIMIT 1) as last_message,
                           (SELECT COUNT(*) FROM ticket_messages m WHERE m.ticket_id = t.id AND m.sender != %s AND m.is_read = FALSE) as unread_count
                    FROM support_tickets t
                    WHERE t.promotion_id = %s AND t.user_id = %s
                    ORDER BY t.created_at DESC
                """, (user_email, promotion_id, user_id))
                for row in cur.fetchall():
                    support_tickets.append({
                        "id": row["id"], "subject": row["subject"], "status": row["status"],
                        "created_at": row["created_at"].strftime('%d %b %Y'),
                        "last_message": row["last_message"][:30] + "..." if row["last_message"] and len(row["last_message"]) > 30 else row["last_message"],
                        "unread_count": row["unread_count"]
                    })

                # 5. If Admin, fetch ALL tickets for this promotion
                if is_admin:
                    cur.execute("""
                        SELECT t.*, u.email as creator_email,
                               (SELECT message FROM ticket_messages m WHERE m.ticket_id = t.id ORDER BY m.created_at DESC LIMIT 1) as last_message,
                               (SELECT COUNT(*) FROM ticket_messages m WHERE m.ticket_id = t.id AND m.sender != %s AND m.is_read = FALSE) as unread_count
                        FROM support_tickets t
                        JOIN app_users u ON t.user_id = u.id
                        WHERE t.promotion_id = %s
                        ORDER BY t.created_at DESC
                    """, (user_email, promotion_id))
                    for row in cur.fetchall():
                        manage_tickets.append({
                            "id": row["id"], "subject": row["subject"], "status": row["status"],
                            "creator_email": row["creator_email"],
                            "created_at": row["created_at"].strftime('%d %b %Y'),
                            "last_message": row["last_message"][:30] + "..." if row["last_message"] and len(row["last_message"]) > 30 else row["last_message"],
                            "unread_count": row["unread_count"]
                        })

    except Exception as e:
        logger.error(f"Error loading promotion detail: {e}")
        return RedirectResponse("/promotions", status_code=status.HTTP_303_SEE_OTHER)

    message = request.query_params.get("msg")
    is_error = request.query_params.get("err") == "1"
    
    new_video_stats = request.session.pop("new_video_stats", None)

    # Fetch registered accounts and currently submitted videos for this campaign
    accounts = get_registered_accounts(user_id)
    submitted_videos = []
    analytics = None

    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
                cur.execute("""
                    SELECT 
                        s.platform, 
                        s.short_link as video_url, 
                        s.upload_time as submitted_at,
                        s.account_name,
                        v.views,
                        v.likes,
                        v.comments,
                        v.last_updated
                    FROM submitted_shorts s
                    LEFT JOIN video_stats v ON s.short_link = v.short_link AND s.platform = v.platform
                    WHERE s.user_id = %s AND s.promotion_id = %s
                    ORDER BY s.upload_time DESC
                """, (user_id, promotion_id))
                
                total_views = 0
                total_likes = 0
                total_comments = 0
                analytics_videos = []

                for row in cur.fetchall():
                    dt = row['submitted_at']
                    # Human readable date format
                    fmt_date = dt.strftime("%B %d, %Y") if dt else "Unknown Date"
                    
                    submitted_videos.append({
                        "platform": row['platform'],
                        "video_url": row['video_url'],
                        "submitted_at": fmt_date
                    })

                    # Handle analytics accumulation
                    if row['views'] is not None:
                        total_views += row['views']
                    if row['likes'] is not None:
                        total_likes += row['likes']
                    if row['comments'] is not None:
                        total_comments += row['comments']
                        
                    last_up_dt = row['last_updated']
                    fmt_last_up = last_up_dt.strftime("%b %d, %H:%M") if last_up_dt else "Just now"

                    analytics_videos.append({
                        "platform": row['platform'],
                        "account_name": row['account_name'],
                        "video_url": row['video_url'],
                        "views": row['views'] or 0,
                        "likes": row['likes'] or 0,
                        "comments": row['comments'] or 0,
                        "last_updated": fmt_last_up
                    })
                
                if analytics_videos:
                    analytics = {
                        "total_views": total_views,
                        "total_likes": total_likes,
                        "total_comments": total_comments,
                        "videos": analytics_videos
                    }

                # --- ADMIN-WIDE ANALYTICS (for Owner/Admin view) ---
                admin_analytics = None
                if is_admin or (promotion and promotion['created_by'] == user_id):
                    cur.execute("""
                        SELECT
                            u.email,
                            u.id as submitter_id,
                            s.platform,
                            s.account_name,
                            s.short_link as video_url,
                            s.upload_time as submitted_at,
                            COALESCE(v.views, 0) as views,
                            COALESCE(v.likes, 0) as likes,
                            COALESCE(v.comments, 0) as comments,
                            v.last_updated,
                            CASE WHEN b.video_url IS NOT NULL THEN TRUE ELSE FALSE END as is_blacklisted
                        FROM submitted_shorts s
                        JOIN app_users u ON s.user_id = u.id
                        LEFT JOIN video_stats v ON s.short_link = v.short_link AND s.platform = v.platform
                        LEFT JOIN blacklisted_videos b ON s.short_link = b.video_url AND s.platform = b.platform AND (b.promotion_id = %s OR b.promotion_id IS NULL)
                        WHERE s.promotion_id = %s
                        ORDER BY u.email, s.upload_time DESC
                    """, (promotion_id, promotion_id))

                    all_rows = cur.fetchall()
                    user_map = {}
                    total_adm_views = total_adm_likes = total_adm_comments = 0

                    for row in all_rows:
                        email = row['email']
                        name = email.split('@')[0]
                        if email not in user_map:
                            user_map[email] = {'name': name, 'submitter_id': row['submitter_id'], 'videos': [],
                                               'total_views': 0, 'total_likes': 0, 'total_comments': 0}
                        last_dt = row['last_updated']
                        fmt_last = last_dt.strftime('%b %d, %H:%M') if last_dt else 'Just now'
                        vid = {
                            'platform': row['platform'],
                            'account_name': row['account_name'],
                            'video_url': row['video_url'],
                            'views': row['views'],
                            'likes': row['likes'],
                            'comments': row['comments'],
                            'last_updated': fmt_last,
                            'is_blacklisted': row['is_blacklisted'],
                        }
                        user_map[email]['videos'].append(vid)
                        if not row['is_blacklisted']:
                            user_map[email]['total_views'] += row['views']
                            user_map[email]['total_likes'] += row['likes']
                            user_map[email]['total_comments'] += row['comments']
                            total_adm_views += row['views']
                            total_adm_likes += row['likes']
                            total_adm_comments += row['comments']

                    admin_analytics = {
                        'users': list(user_map.values()),
                        'total_views': total_adm_views,
                        'total_likes': total_adm_likes,
                        'total_comments': total_adm_comments,
                    }

    except Exception as e:
        logger.error(f"Error fetching promotion submitted videos & analytics: {e}")

    return templates.TemplateResponse(
        "promotion_detail.html",
        {
            "request": request,
            "promotion": dict(promotion) if promotion else None,
            "already_joined": already_joined,
            "join_count": join_count,

            # Additional contexts
            "online_members": online_members,
            "offline_members": offline_members,
            "accounts": accounts,
            "analytics": analytics,
            "admin_analytics": admin_analytics,
            "submitted_videos": submitted_videos,
            "announcements": announcements_data,
            "unread_count": unread_count,
            "support_tickets": support_tickets, 
            "manage_tickets": manage_tickets, 
            "is_admin": is_admin,
            "is_owner": promotion["created_by"] == user_id if promotion else False,
            "new_video_stats": new_video_stats, 
            "message": message, "is_error": is_error, "user_email": request.session.get("email"), "user_id": user_id,
        })

# --- TOGGLE CAMPAIGN STATUS (PAUSE/RESUME) ---
@app.post("/promotions/{promotion_id}/toggle-status")
async def toggle_promotion_status(request: Request, promotion_id: int):
    user_id = get_current_user(request)
    if not user_id:
        return RedirectResponse("/login", status_code=status.HTTP_303_SEE_OTHER)
        
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT created_by, is_active FROM promotions WHERE id = %s", (promotion_id,))
                promo = cur.fetchone()
                if not promo or promo[0] != user_id:
                    return RedirectResponse("/my-promotions?msg=Unauthorized&err=1", status_code=303)
                
                new_status = not promo[1]
                cur.execute("UPDATE promotions SET is_active = %s WHERE id = %s", (new_status, promotion_id))
                conn.commit()
                status_text = "Resumed" if new_status else "Paused"
    except Exception as e:
        logger.error(f"Error toggling promotion status: {e}")
        return RedirectResponse("/my-promotions?msg=System+Error&err=1", status_code=303)

    return RedirectResponse(f"/my-promotions?msg=Campaign+{status_text}+Successfully", status_code=303)


# --- ANNOUNCEMENTS ---
@app.post("/promotions/{promotion_id}/announcements")
async def create_announcement(
    request: Request, 
    promotion_id: int,
    title: str = Form(...),
    message: str = Form(...),
    image: Optional[UploadFile] = File(None)
):
    user_id = get_current_user(request)
    if not user_id:
        return RedirectResponse("/login", status_code=status.HTTP_303_SEE_OTHER)
        
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Security Check: Must be Owner or Admin
                cur.execute("SELECT created_by FROM promotions WHERE id = %s", (promotion_id,))
                promo = cur.fetchone()
                
                is_admin = False
                if promo:
                    if promo[0] == user_id:
                        is_admin = True
                    else:
                        cur.execute("SELECT is_admin FROM promotion_joins WHERE promotion_id = %s AND user_id = %s", (promotion_id, user_id))
                        join_data = cur.fetchone()
                        if join_data and join_data[0]:
                            is_admin = True
                
                if not is_admin:
                    return RedirectResponse(f"/promotions/{promotion_id}?msg=Unauthorized&err=1", status_code=303)
                
                image_url = None
                if image and image.filename:
                    upload_dir = "static/uploads/announcements"
                    os.makedirs(upload_dir, exist_ok=True)
                    ext = os.path.splitext(image.filename)[1]
                    fname = f"promo_{promotion_id}_{uuid4().hex}{ext}"
                    path = os.path.join(upload_dir, fname)
                    with open(path, "wb") as f:
                        f.write(await image.read())
                    image_url = f"/{path}"

                cur.execute(
                    "INSERT INTO announcements (promotion_id, author_id, title, message, image_url) VALUES (%s, %s, %s, %s, %s)",
                    (promotion_id, user_id, title, message, image_url)
                )
                conn.commit()
    except Exception as e:
        logger.error(f"Error creating announcement: {e}")
        return RedirectResponse(f"/promotions/{promotion_id}?msg=Failed+to+create+announcement&err=1", status_code=303)

    return RedirectResponse(f"/promotions/{promotion_id}?msg=Announcement+Posted", status_code=303)

@app.post("/promotions/{promotion_id}/announcements/{announcement_id}/dismiss")
async def dismiss_announcement(request: Request, promotion_id: int, announcement_id: int):
    user_id = get_current_user(request)
    if not user_id:
        return JSONResponse({"status": "unauthorized"}, status_code=401)
        
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO announcement_reads (user_id, announcement_id, is_dismissed) 
                    VALUES (%s, %s, TRUE)
                    ON CONFLICT (user_id, announcement_id) DO UPDATE SET is_dismissed = TRUE
                """, (user_id, announcement_id))
                conn.commit()
    except Exception as e:
        logger.error(f"Error dismissing announcement: {e}")
        return JSONResponse({"status": "error"}, status_code=500)

    return JSONResponse({"status": "success"})


@app.post("/promotions/{promotion_id}/mark_announcements_read")
async def mark_announcements_read(request: Request, promotion_id: int):
    user_id = get_current_user(request)
    if not user_id:
        return JSONResponse({"status": "unauthorized"}, status_code=401)
        
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Find all unread announcements for this campaign (excluding own)
                cur.execute("""
                    SELECT id FROM announcements 
                    WHERE promotion_id = %s AND author_id != %s
                    AND id NOT IN (SELECT announcement_id FROM announcement_reads WHERE user_id = %s)
                """, (promotion_id, user_id, user_id))
                unread = cur.fetchall()
                
                for row in unread:
                    cur.execute(
                        "INSERT INTO announcement_reads (user_id, announcement_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                        (user_id, row[0])
                    )
                conn.commit()
    except Exception as e:
        logger.error(f"Error marking announcements valid: {e}")
        return JSONResponse({"status": "error"}, status_code=500)

    return JSONResponse({"status": "success"})


# --- ADMIN: BLACKLIST A SUBMISSION ---
@app.post("/promotions/{promotion_id}/submissions/blacklist")
async def blacklist_submission(request: Request, promotion_id: int, video_url: str = Form(...), platform: str = Form(...)):
    user_id = get_current_user(request)
    if not user_id:
        return RedirectResponse("/login", status_code=303)
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT created_by FROM promotions WHERE id = %s", (promotion_id,))
                promo = cur.fetchone()
                is_owner_or_admin = False
                if promo:
                    if promo[0] == user_id:
                        is_owner_or_admin = True
                    else:
                        cur.execute("SELECT is_admin FROM promotion_joins WHERE promotion_id = %s AND user_id = %s", (promotion_id, user_id))
                        j = cur.fetchone()
                        if j and j[0]:
                            is_owner_or_admin = True
                if not is_owner_or_admin:
                    return RedirectResponse(f"/promotions/{promotion_id}?msg=Unauthorized&err=1", status_code=303)
                cur.execute(
                    "INSERT INTO blacklisted_videos (platform, video_url, promotion_id) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
                    (platform, video_url, promotion_id)
                )
                conn.commit()
    except Exception as e:
        logger.error(f"Error blacklisting submission: {e}")
        return RedirectResponse(f"/promotions/{promotion_id}?msg=Failed+to+blacklist&err=1", status_code=303)
    return RedirectResponse(f"/promotions/{promotion_id}?msg=Submission+Blacklisted", status_code=303)


# --- ADMIN: WHITELIST A SUBMISSION ---
@app.post("/promotions/{promotion_id}/submissions/whitelist")
async def whitelist_submission(request: Request, promotion_id: int, video_url: str = Form(...), platform: str = Form(...)):
    user_id = get_current_user(request)
    if not user_id:
        return RedirectResponse("/login", status_code=303)
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT created_by FROM promotions WHERE id = %s", (promotion_id,))
                promo = cur.fetchone()
                is_owner_or_admin = False
                if promo:
                    if promo[0] == user_id:
                        is_owner_or_admin = True
                    else:
                        cur.execute("SELECT is_admin FROM promotion_joins WHERE promotion_id = %s AND user_id = %s", (promotion_id, user_id))
                        j = cur.fetchone()
                        if j and j[0]:
                            is_owner_or_admin = True
                if not is_owner_or_admin:
                    return RedirectResponse(f"/promotions/{promotion_id}?msg=Unauthorized&err=1", status_code=303)
                cur.execute(
                    "DELETE FROM blacklisted_videos WHERE platform = %s AND video_url = %s AND promotion_id = %s",
                    (platform, video_url, promotion_id)
                )
                conn.commit()
    except Exception as e:
        logger.error(f"Error whitelisting submission: {e}")
        return RedirectResponse(f"/promotions/{promotion_id}?msg=Failed+to+whitelist&err=1", status_code=303)
    return RedirectResponse(f"/promotions/{promotion_id}?msg=Submission+Restored", status_code=303)


# --- ADMIN: REMOVE A USER'S SUBMISSION ---
@app.post("/promotions/{promotion_id}/submissions/remove")
async def admin_remove_submission(request: Request, promotion_id: int, video_url: str = Form(...), platform: str = Form(...)):
    user_id = get_current_user(request)
    if not user_id:
        return RedirectResponse("/login", status_code=303)
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT created_by FROM promotions WHERE id = %s", (promotion_id,))
                promo = cur.fetchone()
                is_owner_or_admin = False
                if promo:
                    if promo[0] == user_id:
                        is_owner_or_admin = True
                    else:
                        cur.execute("SELECT is_admin FROM promotion_joins WHERE promotion_id = %s AND user_id = %s", (promotion_id, user_id))
                        j = cur.fetchone()
                        if j and j[0]:
                            is_owner_or_admin = True
                if not is_owner_or_admin:
                    return RedirectResponse(f"/promotions/{promotion_id}?msg=Unauthorized&err=1", status_code=303)
                # Remove from blacklist first (cleanup), then delete the submission
                cur.execute("DELETE FROM blacklisted_videos WHERE platform = %s AND video_url = %s AND promotion_id = %s", (platform, video_url, promotion_id))
                cur.execute("DELETE FROM video_stats WHERE platform = %s AND short_link = %s", (platform, video_url))
                cur.execute("DELETE FROM submitted_shorts WHERE platform = %s AND short_link = %s AND promotion_id = %s", (platform, video_url, promotion_id))
                conn.commit()
    except Exception as e:
        logger.error(f"Error removing submission (admin): {e}")
        return RedirectResponse(f"/promotions/{promotion_id}?msg=Failed+to+remove&err=1", status_code=303)
    return RedirectResponse(f"/promotions/{promotion_id}?msg=Submission+Removed", status_code=303)


# --- REMOVE / DESTROY ENTIRE PROMOTION ---
@app.post("/promotions/{promotion_id}/delete")
async def delete_promotion_route(request: Request, promotion_id: int):
    user_id = get_current_user(request)
    if not user_id:
        return RedirectResponse("/login", status_code=status.HTTP_303_SEE_OTHER)
        
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT created_by, campaign_id FROM promotions WHERE id = %s", (promotion_id,))
                promo = cur.fetchone()
                if not promo or promo[0] != user_id:
                    return RedirectResponse("/my-promotions?msg=Unauthorized&err=1", status_code=303)
                
                # Delete Campaign (Cascade automatically deletes from promotions, promotion_joins)
                cur.execute("DELETE FROM campaigns WHERE id = %s", (promo[1],))
                
                # Any submitted shorts tied natively via promotion_id are set to NULL or CASCADE.
                # Just delete them outright if they are orphaned, but CASCADE handles most.
                cur.execute("DELETE FROM submitted_shorts WHERE promotion_id = %s", (promotion_id,))
                conn.commit()
    except Exception as e:
        logger.error(f"Error destroying promotion: {e}")
        return RedirectResponse("/my-promotions?msg=Failed+to+delete+campaign&err=1", status_code=303)

    return RedirectResponse("/my-promotions?msg=Campaign+Deleted+Permanently", status_code=303)


# --- LEAVE A PROMOTION ---
@app.post("/promotions/{promotion_id}/leave")
async def leave_promotion_route(request: Request, promotion_id: int):
    user_id = get_current_user(request)
    if not user_id:
        return RedirectResponse("/login", status_code=status.HTTP_303_SEE_OTHER)
        
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Ensure they aren't the owner
                cur.execute("SELECT created_by FROM promotions WHERE id = %s", (promotion_id,))
                promo = cur.fetchone()
                if promo and promo[0] == user_id:
                    return RedirectResponse(f"/promotions/{promotion_id}?msg=Owner+cannot+leave+campaign,+delete+it+instead&err=1", status_code=303)

                # Delete specific stats tracked inside this campaign
                cur.execute("""
                    DELETE FROM video_stats 
                    WHERE user_id = %s AND short_link IN (
                        SELECT short_link FROM submitted_shorts WHERE promotion_id = %s AND user_id = %s
                    )
                """, (user_id, promotion_id, user_id))
                
                cur.execute("DELETE FROM submitted_shorts WHERE promotion_id = %s AND user_id = %s", (promotion_id, user_id))
                
                # Remove from hierarchy
                cur.execute("DELETE FROM promotion_joins WHERE promotion_id = %s AND user_id = %s", (promotion_id, user_id))
                
                conn.commit()
    except Exception as e:
        logger.error(f"Error leaving promotion: {e}")
        return RedirectResponse(f"/promotions/{promotion_id}?msg=System+Error&err=1", status_code=303)

    return RedirectResponse("/my-promotions?msg=Successfully+left+the+campaign", status_code=303)


# --- UPDATED JOIN ROUTE (redirects to detail page now) ---
@app.post("/promotions/join")
async def join_promotion_route(
    request: Request,
    promotion_id: int = Form(...),
    redirect_to: str = Form(None),
):
    user_id = get_current_user(request)
    if not user_id:
        return RedirectResponse("/login", status_code=status.HTTP_303_SEE_OTHER)

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT is_banned, is_removed FROM promotion_joins WHERE promotion_id = %s AND user_id = %s", (promotion_id, user_id))
                record = cur.fetchone()
                if record:
                    if record[0]: # is_banned
                        return RedirectResponse(f"/promotions/{promotion_id}?msg=You+have+been+banned+from+this+promotion.&err=1", status_code=status.HTTP_303_SEE_OTHER)
                    if record[1]: # is_removed
                        cur.execute("UPDATE promotion_joins SET is_removed = FALSE, joined_at = CURRENT_TIMESTAMP WHERE promotion_id = %s AND user_id = %s", (promotion_id, user_id))
                        conn.commit()
                else:
                    cur.execute(
                        "INSERT INTO promotion_joins (promotion_id, user_id) VALUES (%s, %s) ON CONFLICT (promotion_id, user_id) DO NOTHING",
                        (promotion_id, user_id),
                    )
                    conn.commit()

        dest = redirect_to or f"/promotions/{promotion_id}"
        return RedirectResponse(
            url=f"{dest}?msg=You+have+successfully+joined+this+promotion!",
            status_code=status.HTTP_303_SEE_OTHER,
        )
    except Exception as e:
        logger.error(f"Error joining promotion: {e}")
        return RedirectResponse(
            url=f"/promotions/{promotion_id}?msg=Something+went+wrong.+Please+try+again.&err=1",
            status_code=status.HTTP_303_SEE_OTHER,
        )

# --- MANAGE MEMBER ROUTES ---
@app.post("/promotions/{promotion_id}/members/{target_user_id}/{action}")
async def manage_member(request: Request, promotion_id: int, target_user_id: int, action: str):
    user_id = get_current_user(request)
    if not user_id:
        return RedirectResponse("/login", status_code=status.HTTP_303_SEE_OTHER)

    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
                # 1. Verify caller is admin
                cur.execute("SELECT created_by FROM promotions WHERE id = %s", (promotion_id,))
                promo = cur.fetchone()
                if not promo:
                    return RedirectResponse("/promotions", status_code=status.HTTP_303_SEE_OTHER)
                
                is_admin = (promo["created_by"] == user_id)
                if not is_admin:
                    cur.execute("SELECT is_admin FROM promotion_joins WHERE promotion_id = %s AND user_id = %s AND is_removed = FALSE AND is_banned = FALSE", (promotion_id, user_id))
                    record = cur.fetchone()
                    if record and record[0]:
                        is_admin = True
                
                if not is_admin:
                    return RedirectResponse(f"/promotions/{promotion_id}?msg=Unauthorized&err=1", status_code=status.HTTP_303_SEE_OTHER)
                
                # Cannot modify the creator
                if promo["created_by"] == target_user_id:
                    return RedirectResponse(f"/promotions/{promotion_id}?msg=Cannot+modify+the+campaign+creator&err=1", status_code=status.HTTP_303_SEE_OTHER)

                # Admins cannot act on themselves or on other admins — only the Owner can
                caller_is_owner = (promo["created_by"] == user_id)
                if not caller_is_owner:
                    # Block self-action
                    if target_user_id == user_id:
                        return RedirectResponse(f"/promotions/{promotion_id}?msg=You+cannot+perform+this+action+on+yourself&err=1", status_code=status.HTTP_303_SEE_OTHER)
                    # Block acting on other admins
                    cur.execute("SELECT is_admin FROM promotion_joins WHERE promotion_id = %s AND user_id = %s", (promotion_id, target_user_id))
                    target_record = cur.fetchone()
                    if target_record and target_record["is_admin"]:
                        return RedirectResponse(f"/promotions/{promotion_id}?msg=Admins+cannot+manage+other+admins&err=1", status_code=status.HTTP_303_SEE_OTHER)

                # 2. Perform action
                if action == "make-admin":
                    cur.execute("UPDATE promotion_joins SET is_admin = TRUE WHERE promotion_id = %s AND user_id = %s", (promotion_id, target_user_id))
                    msg = "Member+promoted+to+Admin"
                elif action == "remove-admin":
                    if not caller_is_owner:
                        return RedirectResponse(f"/promotions/{promotion_id}?msg=Only+the+Owner+can+revoke+Admin+rights&err=1", status_code=status.HTTP_303_SEE_OTHER)
                    cur.execute("UPDATE promotion_joins SET is_admin = FALSE WHERE promotion_id = %s AND user_id = %s", (promotion_id, target_user_id))
                    msg = "Admin+rights+revoked"
                elif action == "remove":
                    cur.execute("UPDATE promotion_joins SET is_removed = TRUE, is_admin = FALSE WHERE promotion_id = %s AND user_id = %s", (promotion_id, target_user_id))
                    msg = "Member+removed+from+promotion"
                elif action == "ban":
                    cur.execute("UPDATE promotion_joins SET is_banned = TRUE, is_removed = TRUE, is_admin = FALSE WHERE promotion_id = %s AND user_id = %s", (promotion_id, target_user_id))
                    msg = "Member+banned+permanently"
                else:
                    return RedirectResponse(f"/promotions/{promotion_id}?msg=Invalid+action&err=1", status_code=status.HTTP_303_SEE_OTHER)
                
                conn.commit()
                return RedirectResponse(f"/promotions/{promotion_id}?msg={msg}", status_code=status.HTTP_303_SEE_OTHER)

    except Exception as e:
        logger.error(f"Error managing member: {e}")
        return RedirectResponse(f"/promotions/{promotion_id}?msg=Server+Error&err=1", status_code=status.HTTP_303_SEE_OTHER)

# ==========================================
#        SUPPORT TICKET & CHAT ROUTES
# ==========================================

@app.post("/promotions/{promotion_id}/tickets/create")
async def create_ticket(
    request: Request,
    promotion_id: int,
    category: str = Form(...),
    subject: str = Form(...),
    message: str = Form(...)
):
    user_id = get_current_user(request)
    user_email = request.session.get("email")
    if not user_id:
        return RedirectResponse("/login", status_code=status.HTTP_303_SEE_OTHER)

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # 1. Create the ticket
                cur.execute("""
                    INSERT INTO support_tickets (promotion_id, user_id, category, subject)
                    VALUES (%s, %s, %s, %s) RETURNING id
                """, (promotion_id, user_id, category, subject))
                ticket_id = cur.fetchone()[0]

                # 2. Insert the first message
                cur.execute("""
                    INSERT INTO ticket_messages (ticket_id, sender, message)
                    VALUES (%s, %s, %s)
                """, (ticket_id, user_email, message))
                conn.commit()

        return RedirectResponse(
            url=f"/promotions/{promotion_id}?msg=Ticket+created+successfully",
            status_code=status.HTTP_303_SEE_OTHER
        )
    except Exception as e:
        logger.error(f"Error creating ticket: {e}")
        return RedirectResponse(
            url=f"/promotions/{promotion_id}?msg=Failed+to+create+ticket&err=1",
            status_code=status.HTTP_303_SEE_OTHER
        )


@app.post("/promotions/{promotion_id}/tickets/{ticket_id}/delete")
async def delete_ticket(request: Request, promotion_id: int, ticket_id: int):
    user_id = get_current_user(request)
    if not user_id:
        return RedirectResponse("/login", status_code=status.HTTP_303_SEE_OTHER)

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # 1. Verify permissions (Ticket Creator OR Promotion Admin)
                cur.execute("""
                    SELECT 1 FROM support_tickets 
                    WHERE id = %s AND (
                        user_id = %s OR 
                        (SELECT created_by FROM promotions WHERE id = %s) = %s
                    )
                """, (ticket_id, user_id, promotion_id, user_id))
                
                if not cur.fetchone():
                    return RedirectResponse(f"/promotions/{promotion_id}?msg=Unauthorized&err=1", status_code=status.HTTP_303_SEE_OTHER)

                # 2. Find and delete associated image files from the server
                cur.execute("""
                    SELECT message FROM ticket_messages 
                    WHERE ticket_id = %s AND message LIKE '[IMAGE] %%'
                """, (ticket_id,))
                
                for row in cur.fetchall():
                    try:
                        # Extract the path (e.g. "[IMAGE] /static/uploads/chat/...")
                        filepath = row[0].replace("[IMAGE] /", "")
                        if os.path.exists(filepath):
                            os.remove(filepath)
                            logger.info(f"Deleted ticket image: {filepath}")
                    except Exception as ex:
                        logger.error(f"Failed to delete image file: {ex}")

                # 3. Hard Delete the ticket (this automatically wipes all messages via ON DELETE CASCADE)
                cur.execute("DELETE FROM support_tickets WHERE id = %s", (ticket_id,))
                conn.commit()

        return RedirectResponse(
            url=f"/promotions/{promotion_id}?msg=Ticket+deleted+permanently",
            status_code=status.HTTP_303_SEE_OTHER
        )
    except Exception as e:
        logger.error(f"Error deleting ticket: {e}")
        return RedirectResponse(
            url=f"/promotions/{promotion_id}?msg=Error+deleting+ticket&err=1",
            status_code=status.HTTP_303_SEE_OTHER
        )

@app.post("/promotions/{promotion_id}/tickets/{ticket_id}/upload_image")
async def upload_ticket_image(request: Request, promotion_id: int, ticket_id: int, file: UploadFile = File(...)):
    user_id = get_current_user(request)
    if not user_id:
        return {"status": "error", "message": "Unauthorized"}
    
    try:
        upload_dir = "static/uploads/chat"
        os.makedirs(upload_dir, exist_ok=True)
        ext = os.path.splitext(file.filename)[1]
        
        # Generate a unique filename: ticket_4_a8b9c...png
        fname = f"ticket_{ticket_id}_{uuid4().hex}{ext}"
        path = os.path.join(upload_dir, fname)
        
        # Save to disk
        with open(path, "wb") as f:
            f.write(await file.read())
            
        return {"status": "success", "url": f"/{path}"}
    except Exception as e:
        logger.error(f"Image upload failed: {e}")
        return {"status": "error", "message": str(e)}


@app.websocket("/ws/{promotion_id}/{ticket_id}")
async def websocket_endpoint(websocket: WebSocket, promotion_id: int, ticket_id: int):
    user_email = websocket.session.get("email")
    if not user_email:
        await websocket.close(code=1008)
        return

    room_id = f"{promotion_id}_{ticket_id}"
    await manager.connect(websocket, room_id)

    try:
        while True:
            data = await websocket.receive_json()

            if data["type"] == "history":
                with get_db_connection() as conn:
                    with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
                        cur.execute("""
                            SELECT sender, message, to_char(created_at, 'HH12:MI AM') as time, is_read
                            FROM ticket_messages 
                            WHERE ticket_id = %s ORDER BY created_at ASC
                        """, (ticket_id,))
                        messages = [
                            {"sender": row["sender"], "content": row["message"], "time": row["time"], "is_read": row["is_read"]}
                            for row in cur.fetchall()
                        ]
                await websocket.send_json({"type": "history", "messages": messages})

            elif data["type"] == "message":
                content = data["content"]
                with get_db_connection() as conn:
                    with conn.cursor() as cur:
                        cur.execute("""
                            INSERT INTO ticket_messages (ticket_id, sender, message, is_read)
                            VALUES (%s, %s, %s, FALSE)
                        """, (ticket_id, user_email, content))
                        conn.commit()

                await manager.broadcast({
                    "type": "message",
                    "sender": user_email,
                    "content": content,
                    "time": datetime.now().strftime('%I:%M %p'),
                    "is_read": False
                }, room_id)

            # --- NEW: Handle Read Receipts ---
            elif data["type"] == "mark_read":
                with get_db_connection() as conn:
                    with conn.cursor() as cur:
                        # Mark all unread messages from the OTHER person as read
                        cur.execute("""
                            UPDATE ticket_messages SET is_read = TRUE 
                            WHERE ticket_id = %s AND sender != %s AND is_read = FALSE
                        """, (ticket_id, user_email))
                        
                        if cur.rowcount > 0:
                            conn.commit()
                            # Tell everyone in the room that messages were just read
                            await manager.broadcast({
                                "type": "read_receipt",
                                "reader": user_email
                            }, room_id)

    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
