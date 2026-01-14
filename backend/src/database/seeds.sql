-- Sample seed data for development and testing
-- This file contains sample users, commanders, and games

-- Insert sample users (passwords are 'password123' hashed with bcrypt)
INSERT OR IGNORE INTO users (id, username, password_hash, email) VALUES
(1, 'testuser', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPjRrhSpXqzOa', 'test@example.com'),
(2, 'magictg', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPjRrhSpXqzOa', 'magic@example.com');

-- Insert sample commanders with various color identities
INSERT OR IGNORE INTO commanders (id, name, colors, user_id) VALUES
-- Mono-colored commanders
(1, 'Urza, Lord High Artificer', '["U"]', 1),
(2, 'Gishath, Sun''s Avatar', '["R","G","W"]', 1),
(3, 'Grim-grin, Corpse-Born', '["U","B"]', 1),
(4, 'Krenko, Mob Boss', '["R"]', 2),
(5, 'Ghave, Guru of Spores', '["W","B","G"]', 2),
(6, 'Narset of the Ancient Way', '["U","R","W"]', 1),
(7, 'Tymna the Weaver', '["W","B"]', 2),
(8, 'Kydele, Chosen of Kruphix', '["U","G"]', 1);

-- Insert sample games with varied statistics
INSERT OR IGNORE INTO games (id, date, player_count, commander_id, won, rounds, starting_player_won, sol_ring_turn_one_won, notes, user_id) VALUES
-- Games for user 1 (testuser)
(1, '2024-01-15', 4, 1, 1, 12, 0, 0, 'Great control game, won with infinite artifacts', 1),
(2, '2024-01-18', 3, 1, 0, 8, 1, 1, 'Lost to aggro, Sol Ring helped but not enough', 1),
(3, '2024-01-22', 4, 2, 1, 15, 0, 1, 'Dinosaur tribal worked perfectly', 1),
(4, '2024-01-25', 5, 3, 0, 10, 0, 0, 'Mana issues all game', 1),
(5, '2024-02-01', 4, 1, 1, 13, 1, 0, 'Close game, won with Brain Freeze', 1),
(6, '2024-02-05', 3, 6, 1, 9, 0, 1, 'Narset enchantments carried the game', 1),
(7, '2024-02-08', 4, 8, 0, 11, 1, 0, 'Lost to tribal deck', 1),

-- Games for user 2 (magictg)
(8, '2024-01-16', 4, 4, 1, 14, 0, 1, 'Krenko went infinite on turn 8', 2),
(9, '2024-01-20', 5, 5, 0, 16, 0, 0, 'Sac outlet deck was too slow', 2),
(10, '2024-01-23', 3, 7, 1, 7, 1, 0, 'Partner commanders worked well', 2),
(11, '2024-01-28', 4, 4, 1, 12, 0, 1, 'Goblins are OP in 1v1', 2),
(12, '2024-02-02', 6, 5, 0, 18, 1, 1, '6 player chaos game, fun but lost', 2);

-- Additional games for more comprehensive statistics
INSERT OR IGNORE INTO games (id, date, player_count, commander_id, won, rounds, starting_player_won, sol_ring_turn_one_won, notes, user_id) VALUES
-- More games for user 1
(13, '2024-02-10', 4, 2, 0, 13, 0, 0, 'Board wiped too many times', 1),
(14, '2024-02-12', 3, 6, 1, 8, 1, 1, 'Narset with turn 1 Sol Ring = win', 1),
(15, '2024-02-15', 4, 3, 1, 11, 0, 0, 'Zombie recursion was key', 1),
(16, '2024-02-18', 5, 1, 0, 17, 1, 1, '5 player game, lost to storm', 1),

-- More games for user 2
(17, '2024-02-05', 4, 7, 0, 10, 0, 0, 'Color screw hurt early game', 2),
(18, '2024-02-09', 3, 4, 0, 9, 0, 1, 'Red deck lost to lifegain', 2),
(19, '2024-02-14', 4, 5, 1, 14, 1, 0, 'Ghave tokens got huge', 2),
(20, '2024-02-17', 4, 7, 1, 12, 0, 1, 'Life gain + card draw = win', 2);