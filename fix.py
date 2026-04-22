from core.database import get_db_connection

try:
    print("Connecting to database...")
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # This is the exact SQL command to add the column
            cur.execute("ALTER TABLE ticket_messages ADD COLUMN is_read BOOLEAN DEFAULT FALSE;")
            conn.commit()
    print("✅ Success! The 'is_read' column was added to ticket_messages.")
except Exception as e:
    print(f"❌ Error: {e}")
    print("Note: If it says the column already exists, you are good to go!")