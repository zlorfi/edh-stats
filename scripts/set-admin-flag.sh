#!/bin/bash

# Set the is_admin flag for a specific user inside the PostgreSQL container.
#
# Usage (from repo root):
#   docker compose exec -u postgres postgres /scripts/set-admin-flag.sh <user_id>
#
# Environment variables:
#   DB_NAME - overrides the database name (defaults to edh_stats)

set -euo pipefail

DB_NAME="${DB_NAME:-edh_stats}"

list_users() {
  echo "Available users in database '$DB_NAME':"
  psql -d "$DB_NAME" -P pager=off -c "SELECT id, username, is_admin FROM users ORDER BY id;"
}

if [[ $# -eq 0 ]]; then
  list_users
  echo ""
  echo "Usage: $0 <user_id>" >&2
  exit 0
elif [[ $# -ne 1 ]]; then
  echo "Usage: $0 <user_id>" >&2
  exit 1
fi

USER_ID="$1"
if ! [[ "$USER_ID" =~ ^[0-9]+$ ]]; then
  echo "Error: user_id must be a positive integer" >&2
  exit 1
fi

# Ensure the is_admin column exists
COLUMN_EXISTS=$(psql -qAt -d "$DB_NAME" --set=ON_ERROR_STOP=1 <<SQL
SELECT COUNT(*)
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'is_admin';
SQL
)

if [[ ! "$COLUMN_EXISTS" =~ ^1$ ]]; then
  echo "Error: users.is_admin column not found in database '$DB_NAME'." >&2
  echo "Run the database migrations before using this script." >&2
  exit 1
fi

RESULT=$(psql -qAt -d "$DB_NAME" --set=ON_ERROR_STOP=1 <<SQL
WITH updated AS (
  UPDATE users
  SET is_admin = TRUE,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = $USER_ID
  RETURNING id, username, is_admin
)
SELECT id || '|' || username || '|' || is_admin FROM updated;
SQL
)

if [[ -z "${RESULT// }" ]]; then
  echo "No user found with id $USER_ID" >&2
  exit 1
fi

IFS='|' read -r ID USERNAME IS_ADMIN <<<"$RESULT"
echo "User #$ID ($USERNAME) now has is_admin=$IS_ADMIN"
