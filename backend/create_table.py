#!/usr/bin/env python3
"""
Create users table in Railway Postgres database for Chancify AI authentication.
"""

import psycopg2
import os
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def create_users_table():
    """Create the users table in Railway Postgres."""

    # Get database URL from environment variable
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("❌ DATABASE_URL environment variable not set!")
        print("Set it in your .env file or Railway dashboard")
        return

    print("Connecting to Railway Postgres...")

    try:
        # Connect to database
        conn = psycopg2.connect(database_url)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()

        print("✅ Connected to Railway Postgres successfully!")

        # Create users table
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255), -- Nullable for OAuth users
            first_name VARCHAR(100),
            last_name VARCHAR(100),

            -- OAuth fields
            google_id VARCHAR(255) UNIQUE,
            provider VARCHAR(20) DEFAULT 'local', -- 'local', 'google'

            -- Account status
            is_active BOOLEAN DEFAULT TRUE,
            email_verified BOOLEAN DEFAULT FALSE,

            -- Timestamps
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP WITH TIME ZONE,

            -- Email validation constraint
            CONSTRAINT users_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$')
        );
        """

        print("Creating users table...")
        cursor.execute(create_table_sql)
        print("✅ Users table created successfully!")

        # Create indexes
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);",
            "CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);",
            "CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider);",
            "CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);"
        ]

        print("Creating indexes...")
        for index_sql in indexes:
            cursor.execute(index_sql)
        print("✅ Indexes created successfully!")

        # Verify table exists
        cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_name = 'users';")
        result = cursor.fetchone()

        if result:
            print("✅ Table verification successful!")
            print(f"Table 'users' exists in database.")

            # Show table structure
            cursor.execute("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = 'users'
                ORDER BY ordinal_position;
            """)

            print("\n📋 Table Structure:")
            print("-" * 80)
            for row in cursor.fetchall():
                print(f"{row[0]:<20} {row[1]:<25} {row[2]:<10} {row[3] or ''}")

        else:
            print("❌ Table verification failed!")

        cursor.close()
        conn.close()

        print("\n🎉 Database setup complete!")
        print("You can now use the users table for authentication.")

        return True

    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    success = create_users_table()
    exit(0 if success else 1)
