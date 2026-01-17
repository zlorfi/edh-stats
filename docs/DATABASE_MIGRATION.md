# Database Migration Guide

This guide explains how to use the database migration script to export and import PostgreSQL databases running in Docker containers.

## ⚠️ CRITICAL: Always Use the Migration Script

**DO NOT** import using `psql` directly with the `-f` flag:

```bash
# ❌ WRONG - Will cause errors!
docker compose exec -u postgres postgres psql -d edh_stats -f /backups/backup.sql
```

**Always use the migration script** which automatically clears the database first:

```bash
# ✅ RIGHT - Works perfectly!
docker compose exec -u postgres postgres /scripts/migrate-database.sh \
  --target-db edh_stats \
  --output-file /backups/backup.sql \
  --skip-export
```

**Why?** Direct `psql` import tries to create tables that already exist, causing:
- `ERROR: relation "commanders" already exists`
- `ERROR: multiple primary keys for table`
- `ERROR: trigger already exists`

The migration script **automatically clears all data first**, preventing these conflicts.

## Overview

The `scripts/migrate-database.sh` script runs directly inside the PostgreSQL container and provides:
- **Exporting** data from one database to a file
- **Importing** data from a file into another database
- **Verifying** that the import was successful

This approach is simple because:
- ✅ No need to install PostgreSQL client tools on your host
- ✅ Runs directly inside the container with full access
- ✅ All tools (pg_dump, psql) are already available
- ✅ Works seamlessly with Docker Compose

## Prerequisites

### Required
- Docker Compose running with PostgreSQL service
- The `scripts/migrate-database.sh` file in your project

### Not Required
- PostgreSQL client tools on host machine
- SSH access to servers
- Network connectivity setup

## Basic Usage

### Important: Run as postgres user

All commands must be run with `-u postgres` to authenticate with PostgreSQL:

```bash
docker compose exec -u postgres postgres /scripts/migrate-database.sh [OPTIONS]
```

### 1. Export Database (Backup)

Export the current database to a backup file:

```bash
# Export to file inside container (default: /tmp/edh_stats_backup_TIMESTAMP.sql)
docker compose exec -u postgres postgres /scripts/migrate-database.sh \
  --source-db edh_stats \
  --skip-import

# Export to custom location
docker compose exec -u postgres postgres /scripts/migrate-database.sh \
  --source-db edh_stats \
  --output-file /var/lib/postgresql/backups/my_backup.sql \
  --skip-import
```

### 2. Export and Import to Different Database

Migrate data from one database to another (both in same container):

```bash
docker compose exec -u postgres postgres /scripts/migrate-database.sh \
  --source-db edh_stats \
  --target-db edh_stats_new
```

### 3. Import from Existing Backup (Import-Only)

Import data from an existing backup file without exporting:

```bash
docker compose exec -u postgres postgres /scripts/migrate-database.sh \
  --target-db edh_stats \
  --output-file /backups/edh_stats_backup_20250118_120000.sql \
  --skip-export
```

This is useful when:
- You have a backup file already (from previous export)
- You want to import without re-exporting
- You're restoring from a backup file
- You're importing from external source

### 4. Export from Production to Development

Copy production data to your local development environment:

```bash
# On production server
docker compose exec -u postgres postgres /scripts/migrate-database.sh \
  --source-db edh_stats \
  --output-file /backups/prod_backup.sql \
  --skip-import

# Copy file to your local machine
docker compose cp <container_id>:/backups/prod_backup.sql ./

# Import locally (import-only mode)
docker compose exec -u postgres postgres /scripts/migrate-database.sh \
  --target-db edh_stats \
  --output-file /backups/prod_backup.sql \
  --skip-export
```

### Optional: Create an Alias for Convenience

To avoid typing `-u postgres` every time, add this to your shell profile:

```bash
# Add to ~/.bash_profile, ~/.bashrc, or ~/.zshrc
alias pg-migrate='docker compose exec -u postgres postgres /scripts/migrate-database.sh'
```

Then reload your shell:
```bash
source ~/.bashrc  # or ~/.zshrc for zsh
```

Now use it simply:
```bash
pg-migrate --source-db edh_stats --skip-import
pg-migrate --source-db edh_stats --target-db edh_stats_new
pg-migrate --target-db edh_stats --output-file /backups/backup.sql --skip-export
pg-migrate --help
```

## Command Line Options

```bash
--source-db DATABASE      Source database name (default: edh_stats)
--target-db DATABASE      Target database name (default: edh_stats)
--output-file FILE        Backup file path (default: /backups/edh_stats_backup_TIMESTAMP.sql)
--skip-import             Export only, don't import (backup mode)
--skip-export             Import only, don't export (restore mode - requires existing file)
--help                    Show help message
```

### Mode Combinations

- **Export + Import** (Default): `--source-db X --target-db Y` - Export from X, import to Y
- **Export Only**: `--source-db X --skip-import` - Backup database X to file
- **Import Only**: `--target-db Y --output-file backup.sql --skip-export` - Restore file to Y
- **Both flags** (`--skip-import` + `--skip-export`): Error - not allowed

## Common Scenarios

### Scenario 1: Daily Backup

Create a daily backup of the production database:

```bash
#!/bin/bash
# backup-prod.sh

BACKUP_DATE=$(date +%Y%m%d)
BACKUP_DIR="./backups"

mkdir -p "$BACKUP_DIR"

docker compose -f docker-compose.prod.deployed.yml exec -u postgres postgres \
  /scripts/migrate-database.sh \
  --source-db edh_stats \
  --output-file /var/lib/postgresql/backups/prod_${BACKUP_DATE}.sql \
  --skip-import

echo "Backup completed: $BACKUP_DIR/prod_${BACKUP_DATE}.sql"
```

Run daily with cron:
```bash
0 2 * * * cd /path/to/project && ./backup-prod.sh
```

### Scenario 2: Test Database Refresh

Refresh your test database with latest production data:

```bash
# Export from production
docker compose -f docker-compose.prod.deployed.yml exec -u postgres postgres \
  /scripts/migrate-database.sh \
  --source-db edh_stats \
  --output-file /backups/test_refresh.sql \
  --skip-import

# Copy to local test environment
docker compose cp <prod_container>:/backups/test_refresh.sql ./

# Import to local test database (import-only mode)
docker compose exec -u postgres postgres \
  /scripts/migrate-database.sh \
  --target-db edh_stats_test \
  --output-file /backups/test_refresh.sql \
  --skip-export
```

### Scenario 3: Database Upgrade

Backup before upgrading PostgreSQL version:

```bash
# Backup current database
docker compose exec -u postgres postgres /scripts/migrate-database.sh \
  --source-db edh_stats \
  --output-file /backups/pre_upgrade.sql \
  --skip-import

# Stop services and upgrade PostgreSQL in docker-compose.yml

# Then restore if needed (import-only mode)
# NOTE: Existing data will be cleared before import
docker compose exec -u postgres postgres /scripts/migrate-database.sh \
  --target-db edh_stats \
  --output-file /backups/pre_upgrade.sql \
  --skip-export
```

### Scenario 4: Development Environment Setup

Setup development with production data:

```bash
# Export from production
ssh prod-server "cd /edh-stats && docker compose exec -u postgres postgres /scripts/migrate-database.sh --source-db edh_stats --output-file /backups/dev_setup.sql --skip-import"

# Copy to local machine
scp prod-server:/path/to/backups/dev_setup.sql ./

# Import locally (import-only mode)
docker compose exec -u postgres postgres /scripts/migrate-database.sh \
  --target-db edh_stats \
  --output-file /backups/dev_setup.sql \
  --skip-export
```

### Scenario 5: Quick Restore from Backup

Restore from a backup file without re-exporting:

```bash
# List available backups
docker compose exec postgres ls -lh /backups/

# Restore from specific backup (import-only)
# NOTE: Existing data will be cleared before import
docker compose exec -u postgres postgres /scripts/migrate-database.sh \
  --target-db edh_stats \
  --output-file /backups/edh_stats_backup_20250118_120000.sql \
  --skip-export
```

## What Gets Migrated

### Included ✅
- All tables and schemas
- All data (users, commanders, games)
- Primary keys and foreign keys
- Indexes and constraints
- Sequences

### Not Included ❌
- PostgreSQL roles/users (database-level)
- Database server settings
- Extension configurations

## File Locations

Inside the PostgreSQL container:
- **Default backup**: `/backups/edh_stats_backup_TIMESTAMP.sql`
- **In container**: Access files in container paths

From host machine:
- **Host backups**: `./backups/` (mounted volume)
- **Copy from container**: `docker compose cp <container>:/backups/file ./`
- **Copy to container**: `docker compose cp ./file <container>:/backups/`

Files in `/backups` are automatically synced between container and host via volume mount.

## Access Backup Files from Host

### Option 1: Copy from Container

```bash
# List backups in container
docker compose exec postgres ls -lh /var/lib/postgresql/backups/

# Copy backup to host
docker compose cp postgres:/var/lib/postgresql/backups/backup.sql ./

# Copy to host with docker compose
docker compose cp <container_name>:/var/lib/postgresql/backups/backup.sql ./backups/
```

### Option 2: Use Docker Volumes (Already Configured)

The `docker-compose.yml` already has this configured:

```yaml
services:
  postgres:
    volumes:
      - ./backups:/backups
```

Backups are automatically accessible in `./backups` on host. No additional setup needed!

### Option 3: Use the /backups Mount (Recommended)

The `/backups` directory is already mounted to `./backups` on your host:

```bash
# Export to /backups (automatically synced to ./backups on host)
docker compose exec -u postgres postgres /scripts/migrate-database.sh \
  --source-db edh_stats \
  --output-file /backups/my_backup.sql \
  --skip-import

# File automatically appears at: ./backups/my_backup.sql on host
```

## Import Process

When importing, the script follows this sequence:

1. **Validates** backup file and target database exist
2. **Confirms** with user before proceeding
3. **Clears** all existing data from target database (drops/recreates schema)
4. **Imports** data from backup file
5. **Verifies** that import was successful

### Data Clearing

Before importing, the script:
- Drops the entire `public` schema (removes all tables, views, sequences)
- Recreates the `public` schema with proper permissions
- Ensures a clean slate for the imported data

This means **all existing data in the target database will be deleted**. The script asks for confirmation before proceeding.

## Verification

The script automatically verifies after import:

```
════════════════════════════════════════════════════════════
  Verifying Data Import
════════════════════════════════════════════════════════════

ℹ Checking table counts...
ℹ Source tables: 5
ℹ Target tables: 5
✓ Table counts match

ℹ Checking row counts...
✓ Table 'users': 5 rows (✓ matches)
✓ Table 'commanders': 12 rows (✓ matches)
✓ Table 'games': 48 rows (✓ matches)
```

## Manual Commands (If Needed)

If the script fails, you can run commands directly:

```bash
# Backup manually
docker compose exec postgres pg_dump edh_stats > backup.sql

# Restore manually
docker compose exec -T postgres psql edh_stats < backup.sql

# List databases
docker compose exec postgres psql -l

# Get database size
docker compose exec postgres psql -c "SELECT pg_size_pretty(pg_database_size('edh_stats'));"
```

## Troubleshooting

### "relation already exists" or "multiple primary keys" errors during import

**Cause**: You're using `psql` directly instead of the migration script:

```bash
# ❌ WRONG
docker compose exec -u postgres postgres psql -d edh_stats -f /backups/backup.sql
```

**Solution**: Use the migration script which clears the database first:

```bash
# ✅ RIGHT
docker compose exec -u postgres postgres /scripts/migrate-database.sh \
  --target-db edh_stats \
  --output-file /backups/backup.sql \
  --skip-export
```

The script automatically:
1. Removes pg_dump restrict commands (prevents data blocking)
2. Drops the existing schema
3. Recreates the schema
4. Imports the backup file

This prevents "already exists" conflicts.

### No data imported (users, games, commanders empty)

**Cause**: Your backup file contains pg_dump security commands:

```sql
\restrict IdvbAL1gCAhQZc4dsPYgIzErSH0gRztgmxsbr3dcnr1I1Wymp9VCK54cbXqCR5P
```

These `\restrict` and `\unrestrict` commands tell psql to enter restricted mode, which blocks data loading.

**Solution**: Use the migration script (v2.4+) which automatically removes these:

```bash
docker compose exec -u postgres postgres /scripts/migrate-database.sh \
  --target-db edh_stats \
  --output-file /backups/backup.sql \
  --skip-export
```

The script now:
1. ✓ Detects restrict commands
2. ✓ Removes them automatically
3. ✓ Imports all data successfully

### "psql is not available"

The script must run inside the PostgreSQL container. Use:
```bash
docker compose exec postgres /scripts/migrate-database.sh
```

Not just:
```bash
./scripts/migrate-database.sh  # Wrong - runs on host
```

### "Source database does not exist"

Check available databases:
```bash
docker compose exec postgres psql -l
```

Make sure the database name is correct and exists.

### "Target database does not exist"

Create the target database first:
```bash
docker compose exec postgres createdb edh_stats_new
```

Then run the migration.

### "Permission denied" on output file

Ensure the directory exists and is writable:
```bash
# Check directory
docker compose exec postgres ls -ld /var/lib/postgresql/backups/

# Create if needed
docker compose exec postgres mkdir -p /var/lib/postgresql/backups/
```

### Import takes too long

For large databases, import runs in the background:
```bash
# Monitor progress
docker compose logs -f postgres
```

### File not found after export

Check where the file was written:
```bash
docker compose exec postgres ls -lh /backups/edh_stats_backup_*
```

Files are automatically synced to host at `./backups/` via volume mount.

### Backup file has "pg_dump" syntax errors during import

This issue was fixed in v2.3. If you have old backup files from earlier versions that contain pg_dump comments (like `pg_dump: creating TABLE`), they may cause import errors.

**Solution**: Create a new backup with the updated script:
```bash
docker compose exec -u postgres postgres /scripts/migrate-database.sh \
  --source-db edh_stats \
  --skip-import
```

## Integration Examples

### Backup Before Deployment

```bash
#!/bin/bash
# deploy.sh

# Create backup before deploying
echo "Creating backup..."
docker compose exec -u postgres postgres /scripts/migrate-database.sh \
  --source-db edh_stats \
  --output-file /backups/pre_deploy_$(date +%s).sql \
  --skip-import

# Deploy application
echo "Deploying..."
docker compose -f docker-compose.prod.deployed.yml pull
docker compose -f docker-compose.prod.deployed.yml up -d

# Run schema migrations if needed
docker compose -f docker-compose.prod.deployed.yml exec backend npm run migrate

echo "Deployment complete!"
```

### Continuous Backup Job

```bash
#!/bin/bash
# cron-backup.sh

BACKUP_DIR="./backups"
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

# Create backup (automatically goes to ./backups on host)
docker compose exec -u postgres postgres /scripts/migrate-database.sh \
  --source-db edh_stats \
  --output-file /backups/edh_stats_$(date +%Y%m%d_%H%M%S).sql \
  --skip-import

# Keep only last N days of backups
find "$BACKUP_DIR" -name "edh_stats_*.sql" -mtime +$RETENTION_DAYS -delete

echo "Backup completed at $(date)"
```

### Recovery Procedure

```bash
#!/bin/bash
# recover.sh - Restore from backup (import-only)

BACKUP_FILE="${1:?Usage: $0 <backup_file>}"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Copy file into container
docker compose cp "$BACKUP_FILE" postgres:/backups/restore.sql

# Import (import-only mode - skip export)
docker compose exec -u postgres postgres /scripts/migrate-database.sh \
  --target-db edh_stats \
  --output-file /backups/restore.sql \
  --skip-export

echo "Recovery complete from: $BACKUP_FILE"
```

## Security Considerations

### Backup Files
- Backups contain all data including sensitive information
- Keep backup files secure
- Delete old backups
- Consider encrypting backups

```bash
# Secure permissions on backups
docker compose exec postgres chmod 600 /backups/*.sql

# Encrypt backup
docker compose exec postgres \
  gpg --symmetric --cipher-algo AES256 /backups/backup.sql
```

### Container Access
- Only authorized users should run this script
- Audit backup and restore operations
- Use Docker Compose for local development only

## Performance Tips

- Run exports during off-peak hours
- For large databases (>1GB), export-only mode is faster
- Monitor container resources during import
- Disable unnecessary services during import

## Additional Resources

- [PostgreSQL pg_dump Documentation](https://www.postgresql.org/docs/current/app-pgdump.html)
- [PostgreSQL psql Documentation](https://www.postgresql.org/docs/current/app-psql.html)
- [Docker Compose exec Documentation](https://docs.docker.com/compose/compose-file/compose-file-v3/#exec)

## Version

Script version: 2.4 (Container Edition - Fixed pg_dump Restrictions)  
Last updated: 2026-01-18  
Compatible with: PostgreSQL 10+ in Docker, EDH Stats v1.0+

### Version History
- **v2.4**: Remove pg_dump restrict/unrestrict commands that block data import
- **v2.3**: Fixed pg_dump verbose output causing SQL syntax errors during import
- **v2.2**: Auto-clear existing data before import (drop/recreate schema)
- **v2.1**: Added `--skip-export` flag for import-only operations
- **v2.0**: Initial container-based version with export/import
- **v1.0**: Original version
