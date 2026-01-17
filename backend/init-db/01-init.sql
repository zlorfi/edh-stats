-- PostgreSQL initialization script
-- This runs automatically when PostgreSQL starts as the postgres superuser

-- NOTE: The database 'edh_stats' is created automatically by the POSTGRES_DB environment variable
-- in docker-compose.yml, so we don't need to create it here.
-- This file can be used for any additional initialization that should happen
-- before the application connects, but it is currently a no-op since the
-- schema is created by the database.js migrations runner.
