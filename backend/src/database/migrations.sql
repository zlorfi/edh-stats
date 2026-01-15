-- EDH/Commander Stats Tracker Database Schema
-- SQLite database with proper foreign keys and constraints

-- Enable foreign key support
PRAGMA foreign_keys = ON;

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL CHECK(length(username) >= 3),
    password_hash TEXT NOT NULL CHECK(length(password_hash) >= 60),
    email TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Commanders table with color identity
CREATE TABLE IF NOT EXISTS commanders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL CHECK(length(name) >= 2),
    colors TEXT NOT NULL CHECK(length(colors) >= 2), -- JSON array: ["W", "U", "B", "R", "G"]
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CHECK(json_valid(colors) = 1)
);

-- Games table with all requested statistics
CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL CHECK(date >= '2020-01-01'),
    player_count INTEGER NOT NULL CHECK(player_count >= 2 AND player_count <= 8),
    commander_id INTEGER NOT NULL,
    won BOOLEAN NOT NULL DEFAULT 0 CHECK(won IN (0, 1)),
    rounds INTEGER CHECK(rounds > 0),
    starting_player_won BOOLEAN NOT NULL DEFAULT 0 CHECK(starting_player_won IN (0, 1)),
    sol_ring_turn_one_won BOOLEAN NOT NULL DEFAULT 0 CHECK(sol_ring_turn_one_won IN (0, 1)),
    notes TEXT CHECK(length(notes) <= 1000),
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (commander_id) REFERENCES commanders(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Performance indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_commanders_user_id ON commanders(user_id);
CREATE INDEX IF NOT EXISTS idx_games_user_id ON games(user_id);
CREATE INDEX IF NOT EXISTS idx_games_commander_id ON games(commander_id);
CREATE INDEX IF NOT EXISTS idx_games_date ON games(date);
CREATE INDEX IF NOT EXISTS idx_games_user_commander ON games(user_id, commander_id);
CREATE INDEX IF NOT EXISTS idx_games_user_date ON games(user_id, date);

-- Triggers to update updated_at timestamps
CREATE TRIGGER IF NOT EXISTS update_users_timestamp
    AFTER UPDATE ON users
    FOR EACH ROW
    BEGIN
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_commanders_timestamp
    AFTER UPDATE ON commanders
    FOR EACH ROW
    BEGIN
        UPDATE commanders SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_games_timestamp
    AFTER UPDATE ON games
    FOR EACH ROW
    BEGIN
        UPDATE games SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Views for common statistics queries
CREATE VIEW IF NOT EXISTS user_stats AS
SELECT
    u.id as user_id,
    u.username,
    (SELECT COUNT(DISTINCT id) FROM commanders WHERE user_id = u.id) as total_commanders,
    (SELECT COUNT(*) FROM games WHERE user_id = u.id) as total_games,
    (SELECT COUNT(*) FROM games WHERE user_id = u.id AND won = 1) as total_wins,
    ROUND(
        CASE
            WHEN (SELECT COUNT(*) FROM games WHERE user_id = u.id) > 0
            THEN ((SELECT COUNT(*) FROM games WHERE user_id = u.id AND won = 1) * 100.0 / (SELECT COUNT(*) FROM games WHERE user_id = u.id))
            ELSE 0
        END, 2
    ) as win_rate,
    (SELECT AVG(rounds) FROM games WHERE user_id = u.id) as avg_rounds,
    (SELECT MAX(date) FROM games WHERE user_id = u.id) as last_game_date
FROM users u
GROUP BY u.id, u.username;

CREATE VIEW IF NOT EXISTS commander_stats AS
SELECT
    c.id as commander_id,
    c.name,
    c.colors,
    c.user_id,
    (SELECT COUNT(*) FROM games WHERE commander_id = c.id) as total_games,
    (SELECT COUNT(*) FROM games WHERE commander_id = c.id AND won = 1) as total_wins,
    ROUND(
        CASE
            WHEN (SELECT COUNT(*) FROM games WHERE commander_id = c.id) > 0
            THEN ((SELECT COUNT(*) FROM games WHERE commander_id = c.id AND won = 1) * 100.0 / (SELECT COUNT(*) FROM games WHERE commander_id = c.id))
            ELSE 0
        END, 2
    ) as win_rate,
    (SELECT AVG(rounds) FROM games WHERE commander_id = c.id) as avg_rounds,
    (SELECT COUNT(*) FROM games WHERE commander_id = c.id AND starting_player_won = 1) as starting_player_wins,
    (SELECT COUNT(*) FROM games WHERE commander_id = c.id AND sol_ring_turn_one_won = 1) as sol_ring_wins,
    (SELECT MAX(date) FROM games WHERE commander_id = c.id) as last_played
FROM commanders c;
