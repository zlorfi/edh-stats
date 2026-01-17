-- PostgreSQL initialization script
-- This runs automatically when PostgreSQL starts

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS edh_stats;

-- Note: The user 'edh_user' is created automatically by POSTGRES_USER environment variable
-- The POSTGRES_PASSWORD environment variable sets its password
-- The POSTGRES_DB environment variable sets the default database

-- Grant all privileges to edh_user on edh_stats database
GRANT ALL PRIVILEGES ON DATABASE edh_stats TO edh_user;

-- Allow connections to the database
ALTER DATABASE edh_stats OWNER TO edh_user;
