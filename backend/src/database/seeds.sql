-- Sample seed data for development and testing
-- This file contains sample users, commanders, and games

-- Insert sample users (passwords are 'password123' hashed with bcrypt)
-- Credentials for testing: testuser / password123, magictg / password123
INSERT INTO users (id, username, password_hash, email) VALUES
(1, 'testuser', '$2a$12$TbMEXlrucxJW4cMmkvJHeuLdehtWFBUbKJwL0KgYpeRcoG7ZCTo16', 'test@example.com'),
(2, 'magictg', '$2a$12$TbMEXlrucxJW4cMmkvJHeuLdehtWFBUbKJwL0KgYpeRcoG7ZCTo16', 'magic@example.com')
ON CONFLICT DO NOTHING;

-- Reset sequence for users
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users), true);

-- Insert sample commanders with various color identities
INSERT INTO commanders (id, name, colors, user_id) VALUES
-- Mono-colored commanders
(1, 'Urza, Lord High Artificer', '["U"]'::jsonb, 1),
(2, 'Gishath, Sun''s Avatar', '["R","G","W"]'::jsonb, 1),
(3, 'Grim-grin, Corpse-Born', '["U","B"]'::jsonb, 1),
(4, 'Krenko, Mob Boss', '["R"]'::jsonb, 2),
(5, 'Ghave, Guru of Spores', '["W","B","G"]'::jsonb, 2),
(6, 'Narset of the Ancient Way', '["U","R","W"]'::jsonb, 1),
(7, 'Tymna the Weaver', '["W","B"]'::jsonb, 2),
(8, 'Kydele, Chosen of Kruphix', '["U","G"]'::jsonb, 1)
ON CONFLICT DO NOTHING;

-- Reset sequence for commanders
SELECT setval('commanders_id_seq', (SELECT MAX(id) FROM commanders), true);

-- Insert sample games with varied statistics
INSERT INTO games (id, date, player_count, commander_id, won, rounds, starting_player_won, sol_ring_turn_one_won, notes, user_id) VALUES
-- Games for user 1 (testuser)
(1, '2024-01-15', 4, 1, TRUE, 12, FALSE, FALSE, 'Great control game, won with infinite artifacts', 1),
(2, '2024-01-18', 3, 1, FALSE, 8, TRUE, TRUE, 'Lost to aggro, Sol Ring helped but not enough', 1),
(3, '2024-01-22', 4, 2, TRUE, 15, FALSE, TRUE, 'Dinosaur tribal worked perfectly', 1),
(4, '2024-01-25', 5, 3, FALSE, 10, FALSE, FALSE, 'Mana issues all game', 1),
(5, '2024-02-01', 4, 1, TRUE, 13, TRUE, FALSE, 'Close game, won with Brain Freeze', 1),
(6, '2024-02-05', 3, 6, TRUE, 9, FALSE, TRUE, 'Narset enchantments carried the game', 1),
(7, '2024-02-08', 4, 8, FALSE, 11, TRUE, FALSE, 'Lost to tribal deck', 1),
-- Games for user 2 (magictg)
(8, '2024-01-16', 4, 4, TRUE, 14, FALSE, TRUE, 'Krenko went infinite on turn 8', 2),
(9, '2024-01-20', 5, 5, FALSE, 16, FALSE, FALSE, 'Sac outlet deck was too slow', 2),
(10, '2024-01-23', 3, 7, TRUE, 7, TRUE, FALSE, 'Partner commanders worked well', 2),
(11, '2024-01-28', 4, 4, TRUE, 12, FALSE, TRUE, 'Goblins are OP in 1v1', 2),
(12, '2024-02-02', 6, 5, FALSE, 18, TRUE, TRUE, '6 player chaos game, fun but lost', 2)
ON CONFLICT DO NOTHING;

-- Reset sequence for games
SELECT setval('games_id_seq', (SELECT MAX(id) FROM games), true);

-- Additional games for more comprehensive statistics
INSERT INTO games (id, date, player_count, commander_id, won, rounds, starting_player_won, sol_ring_turn_one_won, notes, user_id) VALUES
-- More games for user 1
(13, '2024-02-10', 4, 2, FALSE, 13, FALSE, FALSE, 'Board wiped too many times', 1),
(14, '2024-02-12', 3, 6, TRUE, 8, TRUE, TRUE, 'Narset with turn 1 Sol Ring = win', 1),
(15, '2024-02-15', 4, 3, TRUE, 11, FALSE, FALSE, 'Zombie recursion was key', 1),
(16, '2024-02-18', 5, 1, FALSE, 17, TRUE, TRUE, '5 player game, lost to storm', 1),
-- More games for user 2
(17, '2024-02-05', 4, 7, FALSE, 10, FALSE, FALSE, 'Color screw hurt early game', 2),
(18, '2024-02-09', 3, 4, FALSE, 9, FALSE, TRUE, 'Red deck lost to lifegain', 2),
(19, '2024-02-14', 4, 5, TRUE, 14, TRUE, FALSE, 'Ghave tokens got huge', 2),
(20, '2024-02-17', 4, 7, TRUE, 12, FALSE, TRUE, 'Life gain + card draw = win', 2)
ON CONFLICT DO NOTHING;

-- Reset sequence for games to cover all inserted IDs
SELECT setval('games_id_seq', (SELECT MAX(id) FROM games), true);
