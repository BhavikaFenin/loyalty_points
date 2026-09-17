const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(
    path.join(__dirname, "loyalty.db")
);

db.pragma("foreign_keys = ON");

db.exec(`
    CREATE TABLE IF NOT EXISTS members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL UNIQUE,
        points REAL NOT NULL DEFAULT 0,
        lifetime_points REAL NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS point_lots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        member_id INTEGER NOT NULL,
        points REAL NOT NULL,
        remaining REAL NOT NULL,
        earned_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        FOREIGN KEY (member_id)
            REFERENCES members(id)
            ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        member_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        amount REAL DEFAULT 0,
        points REAL NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (member_id)
            REFERENCES members(id)
            ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS outbox (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        member_id INTEGER NOT NULL,
        event_type TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        delivered INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (member_id)
            REFERENCES members(id)
            ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_members_phone
    ON members(phone);

    CREATE INDEX IF NOT EXISTS idx_point_lots_expiry
    ON point_lots(expires_at);

    CREATE INDEX IF NOT EXISTS idx_outbox_delivered
    ON outbox(delivered);
`);

module.exports = db;