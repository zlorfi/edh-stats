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
    COUNT(DISTINCT c.id) as total_commanders,
    COUNT(g.id) as total_games,
    SUM(CASE WHEN g.won = 1 THEN 1 ELSE 0 END) as total_wins,
    ROUND(
        CASE 
            WHEN COUNT(g.id) > 0 THEN (SUM(CASE WHEN g.won = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(g.id))
            ELSE 0 
        END, 2
    ) as win_rate,
    AVG(g.rounds) as avg_rounds,
    MAX(g.date) as last_game_date
FROM users u
LEFT JOIN commanders c ON u.id = c.user_id
LEFT JOIN games g ON u.id = g.user_id
GROUP BY u.id, u.username;

CREATE VIEW IF NOT EXISTS commander_stats AS
SELECT 
    c.id as commander_id,
    c.name,
    c.colors,
    c.user_id,
    COUNT(g.id) as total_games,
    SUM(CASE WHEN g.won = 1 THEN 1 ELSE 0 END) as total_wins,
    ROUND(
        CASE 
            WHEN COUNT(g.id) > 0 THEN (SUM(CASE WHEN g.won = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(g.id))
            ELSE 0 
        END, 2
    ) as win_rate,
    AVG(g.rounds) as avg_rounds,
    SUM(CASE WHEN g.starting_player_won = 1 THEN 1 ELSE 0 END) as starting_player_wins,
    SUM(CASE WHEN g.sol_ring_turn_one_won = 1 THEN 1 ELSE 0 END) as sol_ring_wins,
    MAX(g.date) as last_played
FROM commanders c
LEFT JOIN games g ON c.id = g.commander_id
GROUP BY c.id, c.name, c.colors, c.user_id;