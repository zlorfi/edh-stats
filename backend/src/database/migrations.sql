-- EDH/Commander Stats Tracker Database Schema
-- PostgreSQL database with proper constraints

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL CHECK(LENGTH(username) >= 3),
    password_hash TEXT NOT NULL CHECK(LENGTH(password_hash) >= 60),
    email TEXT UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Commanders table with color identity
CREATE TABLE IF NOT EXISTS commanders (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL CHECK(LENGTH(name) >= 2),
    colors JSONB NOT NULL,
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT valid_colors CHECK(jsonb_typeof(colors) = 'array')
);

-- Games table with all requested statistics
CREATE TABLE IF NOT EXISTS games (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL CHECK(date >= '2020-01-01'),
    player_count INTEGER NOT NULL CHECK(player_count >= 2 AND player_count <= 8),
    commander_id INTEGER NOT NULL,
    won BOOLEAN NOT NULL DEFAULT FALSE,
    rounds INTEGER CHECK(rounds > 0),
    starting_player_won BOOLEAN NOT NULL DEFAULT FALSE,
    sol_ring_turn_one_won BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT CHECK(LENGTH(notes) <= 1000),
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to update updated_at timestamps
DROP TRIGGER IF EXISTS update_users_timestamp ON users;
CREATE TRIGGER update_users_timestamp
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS update_commanders_timestamp ON commanders;
CREATE TRIGGER update_commanders_timestamp
    BEFORE UPDATE ON commanders
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS update_games_timestamp ON games;
CREATE TRIGGER update_games_timestamp
    BEFORE UPDATE ON games
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- Views for common statistics queries
DROP VIEW IF EXISTS user_stats CASCADE;
CREATE VIEW user_stats AS
SELECT
    u.id as user_id,
    u.username,
    (SELECT COUNT(DISTINCT id) FROM commanders WHERE user_id = u.id) as total_commanders,
    (SELECT COUNT(*) FROM games WHERE user_id = u.id) as total_games,
    (SELECT COUNT(*) FROM games WHERE user_id = u.id AND won = TRUE) as total_wins,
    ROUND(
        CASE
            WHEN (SELECT COUNT(*) FROM games WHERE user_id = u.id) > 0
            THEN ((SELECT COUNT(*) FROM games WHERE user_id = u.id AND won = TRUE)::NUMERIC * 100.0 / (SELECT COUNT(*) FROM games WHERE user_id = u.id))
            ELSE 0
        END, 2
    ) as win_rate,
    (SELECT AVG(rounds) FROM games WHERE user_id = u.id) as avg_rounds,
    (SELECT MAX(date) FROM games WHERE user_id = u.id) as last_game_date
FROM users u
GROUP BY u.id, u.username;

DROP VIEW IF EXISTS commander_stats CASCADE;
CREATE VIEW commander_stats AS
SELECT
    c.id as commander_id,
    c.name,
    c.colors,
    c.user_id,
    (SELECT COUNT(*) FROM games WHERE commander_id = c.id) as total_games,
    (SELECT COUNT(*) FROM games WHERE commander_id = c.id AND won = TRUE) as total_wins,
    ROUND(
        CASE
            WHEN (SELECT COUNT(*) FROM games WHERE commander_id = c.id) > 0
            THEN ((SELECT COUNT(*) FROM games WHERE commander_id = c.id AND won = TRUE)::NUMERIC * 100.0 / (SELECT COUNT(*) FROM games WHERE commander_id = c.id))
            ELSE 0
        END, 2
    ) as win_rate,
    (SELECT AVG(rounds) FROM games WHERE commander_id = c.id) as avg_rounds,
    (SELECT COUNT(*) FROM games WHERE commander_id = c.id AND starting_player_won = TRUE) as starting_player_wins,
    (SELECT COUNT(*) FROM games WHERE commander_id = c.id AND sol_ring_turn_one_won = TRUE) as sol_ring_wins,
    (SELECT MAX(date) FROM games WHERE commander_id = c.id) as last_played
FROM commanders c;
