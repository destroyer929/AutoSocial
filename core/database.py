import psycopg2
import psycopg2.extras
import bcrypt
from datetime import datetime, timedelta, timezone
from core.config import DB_CONFIG


# --- DATABASE CONNECTION ---
def get_db_connection():
    return psycopg2.connect(**DB_CONFIG)


# --- INITIALIZATION ---
def initialize_database():
    try:
        # 1. Create the database if it doesn't exist
        conn = psycopg2.connect(
            dbname="postgres",
            user=DB_CONFIG["user"],
            password=DB_CONFIG["password"],
            host=DB_CONFIG["host"],
            port=DB_CONFIG["port"],
        )
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM pg_database WHERE datname = 'discord_bot_db'")
            if not cur.fetchone():
                cur.execute("CREATE DATABASE discord_bot_db")
                print("✅ Database 'discord_bot_db' created.")
        conn.close()

        # 2. Connect to the actual bot database and create tables
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # --- BOT CORE TABLES ---
                # Web user id is separated from any other user_id usage
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS registered_accounts (
                        id SERIAL PRIMARY KEY,
                        web_user_id BIGINT NOT NULL,    -- web app user's id (app_users.id)
                        -- OPTIONAL: keep this if you still have a discord/bot user id
                        user_id BIGINT,                 -- old/discord id, can be NULL
                        platform VARCHAR(255) NOT NULL,
                        account_name VARCHAR(255) NOT NULL,
                        CONSTRAINT registered_accounts_web_user_platform_account_unique
                            UNIQUE (web_user_id, platform, account_name),
                        CONSTRAINT registered_accounts_global_platform_account_unique
                            UNIQUE (platform, account_name)
                    )
                """
                )

                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS submitted_shorts (
                        id SERIAL PRIMARY KEY,
                        user_id BIGINT NOT NULL,
                        platform VARCHAR(255) NOT NULL,
                        account_name VARCHAR(255) NOT NULL,
                        short_link VARCHAR(255) NOT NULL,
                        upload_time TIMESTAMP WITH TIME ZONE,
                        promotion_id INTEGER REFERENCES promotions(id) ON DELETE SET NULL,
                        FOREIGN KEY (user_id, platform, account_name)
                            REFERENCES registered_accounts (web_user_id, platform, account_name)
                    )
                """
                )

                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS platform_prices (
                        platform VARCHAR(255) PRIMARY KEY,
                        pricing_model VARCHAR(20) NOT NULL CHECK (pricing_model IN ('pot', 'per_million')),
                        amount DECIMAL NOT NULL
                    )
                """
                )

                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS settings (
                        setting_key VARCHAR(255) PRIMARY KEY,
                        setting_value TEXT
                    )
                """
                )

                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS blacklisted_videos (
                        platform VARCHAR(255) NOT NULL,
                        video_url VARCHAR(255) NOT NULL,
                        promotion_id INTEGER REFERENCES promotions(id) ON DELETE CASCADE,
                        blacklisted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                        PRIMARY KEY (platform, video_url, promotion_id)
                    )
                """
                )

                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS submission_log (
                        id SERIAL PRIMARY KEY,
                        user_id BIGINT NOT NULL,
                        platform VARCHAR(255) NOT NULL,
                        video_url VARCHAR(255) NOT NULL,
                        account_name VARCHAR(255),
                        action VARCHAR(50) NOT NULL,
                        promotion_id INTEGER REFERENCES promotions(id) ON DELETE SET NULL,
                        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    )
                """
                )

                # Drop old cache table if exists, recreate video_stats
                cur.execute("DROP TABLE IF EXISTS stats_cache")
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS video_stats (
                        user_id BIGINT NOT NULL,
                        platform VARCHAR(255) NOT NULL,
                        short_link VARCHAR(255) NOT NULL,
                        views BIGINT NOT NULL DEFAULT 0,
                        likes BIGINT NOT NULL DEFAULT 0,
                        comments BIGINT NOT NULL DEFAULT 0,
                        last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        PRIMARY KEY (user_id, platform, short_link)
                    )
                """
                )
                
                cur.execute("""ALTER TABLE app_users ADD COLUMN IF NOT EXISTS last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;""")
                
                # --- Migrations for promotion_id in submissions ---
                try:
                    cur.execute("ALTER TABLE submitted_shorts ADD COLUMN IF NOT EXISTS promotion_id INTEGER REFERENCES promotions(id) ON DELETE SET NULL;")
                except Exception:
                    pass

                try:
                    cur.execute("ALTER TABLE submission_log ADD COLUMN IF NOT EXISTS promotion_id INTEGER REFERENCES promotions(id) ON DELETE SET NULL;")
                except Exception:
                    pass
                    
                conn.commit()

                # Bot Verification Tables (now tied to web user)
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS pending_registrations (
                        web_user_id BIGINT NOT NULL,
                        platform VARCHAR(255) NOT NULL,
                        username VARCHAR(255) NOT NULL,
                        verification_code VARCHAR(5) NOT NULL,
                        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        PRIMARY KEY (web_user_id, platform)
                    )
                """
                )

                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS pending_force_unlinks (
                        user_id BIGINT NOT NULL,
                        platform VARCHAR(255) NOT NULL,
                        username VARCHAR(255) NOT NULL,
                        verification_code VARCHAR(5) NOT NULL,
                        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        PRIMARY KEY (user_id, platform)
                    )
                """
                )

                # User Settings & Payments
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS user_privacy (
                        user_id BIGINT PRIMARY KEY,
                        anonymous BOOLEAN NOT NULL DEFAULT FALSE
                    )
                """
                )

                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS user_payments (
                        user_id BIGINT PRIMARY KEY,
                        btc_address TEXT,
                        eth_address TEXT,
                        usdt_address TEXT,
                        sol_address TEXT,
                        paypal_others TEXT
                    )
                """
                )

                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS cleared_submissions_backup (
                        id SERIAL PRIMARY KEY,
                        cleared_at TIMESTAMP WITH TIME ZONE,
                        submissions JSONB,
                        stats JSONB
                    )
                """
                )

                # --- DEFAULT SETTINGS ---
                cur.execute(
                    "INSERT INTO settings (setting_key, setting_value) "
                    "VALUES ('72hr_rule', 'false') ON CONFLICT DO NOTHING"
                )
                cur.execute(
                    "INSERT INTO settings (setting_key, setting_value) "
                    "VALUES ('cutoff_date', NULL) ON CONFLICT DO NOTHING"
                )
                cur.execute(
                    "INSERT INTO settings (setting_key, setting_value) "
                    "VALUES ('submissions_paused', 'false') ON CONFLICT DO NOTHING"
                )
                cur.execute(
                    "INSERT INTO settings (setting_key, setting_value) "
                    "VALUES ('stats_last_updated', NULL) ON CONFLICT DO NOTHING"
                )

                for p in ["youtube", "twitter", "instagram", "tiktok"]:
                    cur.execute(
                        f"INSERT INTO settings (setting_key, setting_value) "
                        f"VALUES ('platform_{p}_enabled', 'true') ON CONFLICT DO NOTHING"
                    )

                # --- ADMIN & SERVER TABLES ---
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS server_details (
                        server_id BIGINT PRIMARY KEY,
                        server_name TEXT,
                        server_image TEXT,
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    )
                """
                )

                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS server_views (
                        server_id BIGINT PRIMARY KEY,
                        total_views BIGINT NOT NULL DEFAULT 0,
                        last_reset TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    )
                """
                )

                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS platform_views (
                        server_id BIGINT NOT NULL,
                        platform TEXT NOT NULL,
                        views BIGINT NOT NULL DEFAULT 0,
                        PRIMARY KEY (server_id, platform)
                    )
                """
                )

                # --- 🔐 WEB AUTHENTICATION TABLES ---
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS app_users (
                        id SERIAL PRIMARY KEY,
                        email VARCHAR(255) UNIQUE NOT NULL,
                        password_hash TEXT NOT NULL,
                        is_verified BOOLEAN NOT NULL DEFAULT FALSE,
                        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
                    )
                """
                )

                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS email_verification_tokens (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
                        token VARCHAR(255) UNIQUE NOT NULL,
                        expires_at TIMESTAMPTZ NOT NULL
                    )
                """
                )

                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS password_reset_tokens (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
                        token VARCHAR(255) UNIQUE NOT NULL,
                        expires_at TIMESTAMPTZ NOT NULL
                    )
                """
                )

                # --- CAMPAIGNS & PROMOTIONS TABLES ---
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS campaigns (
                        id SERIAL PRIMARY KEY,
                        user_id BIGINT NOT NULL,
                        title VARCHAR(255) NOT NULL,           -- name
                        description TEXT,                      -- description
                        image_path TEXT,                       -- uploaded image
                        platforms TEXT,                        -- 'all' or 'instagram,youtube'
                        campaign_type VARCHAR(255),            -- podcasts / gaming / etc.
                        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
                    )
                """
                )

                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS promotions (
                        id SERIAL PRIMARY KEY,
                        campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
                        created_by BIGINT NOT NULL,
                        platform VARCHAR(255),
                        name VARCHAR(255) NOT NULL,
                        details TEXT,
                        is_active BOOLEAN NOT NULL DEFAULT TRUE,
                        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
                    )
                """
                )


                # NEW: track which users joined which promotions
                cur.execute("""
                CREATE TABLE IF NOT EXISTS promotion_joins (
                    id SERIAL PRIMARY KEY,
                    promotion_id INTEGER NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
                    user_id BIGINT NOT NULL,
                    joined_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE (promotion_id, user_id)
                )
            """)
                
                # Migrate existing tables with new fields
                cur.execute("ALTER TABLE app_users ADD COLUMN IF NOT EXISTS last_active TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP")
                cur.execute("ALTER TABLE promotion_joins ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE")
                cur.execute("ALTER TABLE promotion_joins ADD COLUMN IF NOT EXISTS is_removed BOOLEAN DEFAULT FALSE")
                cur.execute("ALTER TABLE promotion_joins ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE")

                # --- Migrate blacklisted_videos to support per-promotion scope ---
                try:
                    cur.execute("ALTER TABLE blacklisted_videos ADD COLUMN IF NOT EXISTS promotion_id INTEGER REFERENCES promotions(id) ON DELETE CASCADE")
                except Exception:
                    pass
                try:
                    cur.execute("ALTER TABLE blacklisted_videos ADD COLUMN IF NOT EXISTS blacklisted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP")
                except Exception:
                    pass

                cur.execute("""
                CREATE TABLE IF NOT EXISTS announcements (
                    id SERIAL PRIMARY KEY,
                    promotion_id INTEGER NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
                    author_id BIGINT NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    message TEXT NOT NULL,
                    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
                )
                """)

                cur.execute("""
                CREATE TABLE IF NOT EXISTS announcement_reads (
                    user_id BIGINT NOT NULL,
                    announcement_id INTEGER NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
                    read_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                    is_dismissed BOOLEAN DEFAULT FALSE,
                    PRIMARY KEY (user_id, announcement_id)
                )
                """)

                # Migrations for new announcement features
                cur.execute("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS image_url TEXT")
                cur.execute("ALTER TABLE announcement_reads ADD COLUMN IF NOT EXISTS is_dismissed BOOLEAN DEFAULT FALSE")

                # --- SUPPORT TICKET TABLES ---
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS support_tickets (
                        id SERIAL PRIMARY KEY,
                        promotion_id INT NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
                        user_id BIGINT NOT NULL,
                        category VARCHAR(50),
                        subject VARCHAR(255),
                        status VARCHAR(20) DEFAULT 'open',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                    """
                )

                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS ticket_messages (
                        id SERIAL PRIMARY KEY,
                        ticket_id INT REFERENCES support_tickets(id) ON DELETE CASCADE,
                        sender VARCHAR(100),
                        message TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                    """
                )

                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS ticket_messages (
                        id SERIAL PRIMARY KEY,
                        ticket_id INT REFERENCES support_tickets(id) ON DELETE CASCADE,
                        sender VARCHAR(100),
                        message TEXT,
                        is_read BOOLEAN DEFAULT FALSE, 
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                    """
                )


            conn.commit()
            print("All database tables checked/created successfully.")

    except Exception as e:
        print(f"Error initializing database: {e}")


# --- ADMIN & STATS FUNCTIONS ---

def set_server_details(server_id, server_name, server_image):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM server_details WHERE server_id = %s", (server_id,))
            exists = cur.fetchone()
            if exists:
                cur.execute(
                    """
                    UPDATE server_details
                    SET server_name = %s, server_image = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE server_id = %s
                    """,
                    (server_name, server_image, server_id),
                )
                conn.commit()
                return True
            else:
                cur.execute(
                    """
                    INSERT INTO server_details (server_id, server_name, server_image)
                    VALUES (%s, %s, %s)
                    """,
                    (server_id, server_name, server_image),
                )
                conn.commit()
                return False


def get_server_details(server_id):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute(
                "SELECT server_name, server_image FROM server_details WHERE server_id = %s",
                (server_id,),
            )
            return cur.fetchone()


def increment_platform_views(server_id, platform, views):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO platform_views (server_id, platform, views)
                VALUES (%s, %s, %s)
                ON CONFLICT (server_id, platform)
                DO UPDATE SET views = platform_views.views + EXCLUDED.views
                """,
                (server_id, platform, views),
            )
            conn.commit()


def get_platform_views(server_id, platform):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT views FROM platform_views WHERE server_id = %s AND platform = %s
                """,
                (server_id, platform),
            )
            result = cur.fetchone()
            return result[0] if result else 0


def get_all_platform_views(server_id):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute(
                """
                SELECT platform, views FROM platform_views WHERE server_id = %s
                """,
                (server_id,),
            )
            return {row["platform"]: row["views"] for row in cur.fetchall()}


def increment_total_views(server_id, views):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO server_views (server_id, total_views)
                VALUES (%s, %s)
                ON CONFLICT (server_id)
                DO UPDATE SET total_views = server_views.total_views + EXCLUDED.total_views
                """,
                (server_id, views),
            )
            conn.commit()


def get_total_views(server_id):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT total_views FROM server_views WHERE server_id = %s
                """,
                (server_id,),
            )
            result = cur.fetchone()
            return result[0] if result else 0


def reset_total_views(server_id):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE server_views SET total_views = 0, last_reset = CURRENT_TIMESTAMP WHERE server_id = %s
                """,
                (server_id,),
            )
            conn.commit()


# --- 🔐 WEB AUTHENTICATION FUNCTIONS (UPDATED FOR OTP) ---

def create_app_user(email: str, password: str, verification_code: str = None):
    """
    Creates a new web user. If verification_code is provided,
    stores it in the email_verification_tokens table.
    """
    password_hash = bcrypt.hashpw(
        password.encode("utf-8"), bcrypt.gensalt()
    ).decode("utf-8")

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # 1. Create User
            cur.execute(
                "INSERT INTO app_users (email, password_hash) VALUES (%s, %s) RETURNING id",
                (email, password_hash),
            )
            user_id = cur.fetchone()[0]

            # 2. Store Verification Code (if provided)
            if verification_code:
                expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)
                cur.execute(
                    """
                    INSERT INTO email_verification_tokens (user_id, token, expires_at)
                    VALUES (%s, %s, %s)
                    """,
                    (user_id, verification_code, expires_at),
                )

            conn.commit()
            return user_id


def get_app_user_by_email(email: str):
    """Fetches a user record by email."""
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute("SELECT * FROM app_users WHERE email = %s", (email,))
            return cur.fetchone()


def verify_password(plain_password: str, password_hash: str) -> bool:
    """Verifies a plain password against the stored hash."""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"), password_hash.encode("utf-8")
    )


def verify_user_email(email: str, code: str) -> bool:
    """
    Checks if the provided code matches the pending email verification.
    If valid, marks user as verified and removes the code.
    """
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            # Find the user first
            cur.execute("SELECT id FROM app_users WHERE email = %s", (email,))
            user_row = cur.fetchone()
            if not user_row:
                return False
            user_id = user_row["id"]

            # Check Code
            cur.execute(
                """
                SELECT expires_at FROM email_verification_tokens
                WHERE user_id = %s AND token = %s
                """,
                (user_id, code),
            )

            token_row = cur.fetchone()
            if not token_row:
                return False  # Invalid Code

            # Check Expiry
            expires_at = token_row["expires_at"]
            if expires_at < datetime.now(timezone.utc):
                return False  # Expired

            # Mark Verified & Clean up
            cur.execute(
                "UPDATE app_users SET is_verified = TRUE WHERE id = %s", (user_id,)
            )
            cur.execute(
                "DELETE FROM email_verification_tokens WHERE user_id = %s",
                (user_id,),
            )
            conn.commit()
            return True


def set_reset_code(email: str, code: str):
    """Stores a password reset code for the user."""
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM app_users WHERE email = %s", (email,))
            user_row = cur.fetchone()
            if user_row:
                user_id = user_row[0]
                expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

                # Upsert/Replace existing code
                cur.execute(
                    "DELETE FROM password_reset_tokens WHERE user_id = %s", (user_id,)
                )
                cur.execute(
                    """
                    INSERT INTO password_reset_tokens (user_id, token, expires_at)
                    VALUES (%s, %s, %s)
                    """,
                    (user_id, code, expires_at),
                )
                conn.commit()


def reset_password(email: str, code: str, new_password: str) -> bool:
    """
    Verifies reset code and updates password if valid.
    """
    password_hash = bcrypt.hashpw(
        new_password.encode("utf-8"), bcrypt.gensalt()
    ).decode("utf-8")

    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute("SELECT id FROM app_users WHERE email = %s", (email,))
            user_row = cur.fetchone()
            if not user_row:
                return False
            user_id = user_row["id"]

            # Check Code
            cur.execute(
                """
                SELECT expires_at FROM password_reset_tokens
                WHERE user_id = %s AND token = %s
                """,
                (user_id, code),
            )

            token_row = cur.fetchone()
            if not token_row:
                return False

            # Check Expiry
            if token_row["expires_at"] < datetime.now(timezone.utc):
                return False

            # Update Password & Clean Up
            cur.execute(
                "UPDATE app_users SET password_hash = %s WHERE id = %s",
                (password_hash, user_id),
            )
            cur.execute(
                "DELETE FROM password_reset_tokens WHERE user_id = %s", (user_id,)
            )
            conn.commit()
            return True


def create_campaign(
    user_id: int,
    title: str,
    description: str = None,
    image_path: str = None,
    platforms: str = "all",
    campaign_type: str = None,
    budget: float | None = None,
) -> int:
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO campaigns (
                    user_id, title, description,
                    image_path, platforms, campaign_type, budget
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (user_id, title, description, image_path, platforms, campaign_type, budget),
            )
            campaign_id = cur.fetchone()[0]
            conn.commit()
            return campaign_id



def list_promotions(search: str | None = None):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            base = """
                SELECT
                    p.*,
                    c.title         AS campaign_title,
                    c.image_path    AS image_path,
                    c.platforms     AS platforms,
                    c.campaign_type AS campaign_type,
                    c.budget        AS budget
                FROM promotions p
                JOIN campaigns c ON p.campaign_id = c.id
                WHERE p.is_active = TRUE
            """
            params = []
            if search:
                base += " AND (p.name ILIKE %s OR c.title ILIKE %s)"
                params.extend([f"%{search}%", f"%{search}%"])
            base += " ORDER BY p.created_at DESC"
            cur.execute(base, tuple(params))
            return cur.fetchall()


def create_promotion(
    campaign_id: int,
    created_by: int,
    name: str,
    details: str = None,
    platform: str = None,
    is_active: bool = True,
):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO promotions (
                    campaign_id,
                    created_by,
                    platform,
                    name,
                    details,
                    is_active
                )
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (campaign_id, created_by, platform, name, details, is_active),
            )
        conn.commit()


def join_promotion(promotion_id: int, user_id: int) -> None:
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO promotion_joins (promotion_id, user_id)
                VALUES (%s, %s)
                ON CONFLICT (promotion_id, user_id) DO NOTHING
                """,
                (promotion_id, user_id),
            )
            conn.commit()
