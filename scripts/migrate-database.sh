#!/bin/bash

##############################################################################
# EDH Stats Tracker - Database Migration Script (Container Version)
#
# This script exports data from one PostgreSQL database and imports it
# into another database, running directly inside the PostgreSQL container.
#
# Usage: docker compose exec postgres /scripts/migrate-database.sh [OPTIONS]
#
# Options:
#   --source-db DATABASE        Source database name (default: edh_stats)
#   --target-db DATABASE        Target database name (default: edh_stats)
#   --output-file FILE          Backup file path (default: /backups/backup_TIMESTAMP.sql)
#   --skip-import               Export only, don't import
#   --skip-export               Import only, don't export (must provide existing file)
#   --help                      Show this help message
#
# Examples:
#   # Export current database (saves to ./backups on host)
#   docker compose exec -u postgres postgres /scripts/migrate-database.sh \
#     --source-db edh_stats \
#     --skip-import
#
#   # Export and import to different database
#   docker compose exec -u postgres postgres /scripts/migrate-database.sh \
#     --source-db edh_stats \
#     --target-db edh_stats_new
#
#   # Import from existing backup file (import-only)
#   docker compose exec -u postgres postgres /scripts/migrate-database.sh \
#     --target-db edh_stats \
#     --output-file /backups/edh_stats_backup_20250118_120000.sql \
#     --skip-export
#
#   # Export to custom location (still on host via mount)
#   docker compose exec -u postgres postgres /scripts/migrate-database.sh \
#     --source-db edh_stats \
#     --output-file /backups/custom_backup.sql \
#     --skip-import
#
##############################################################################

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Defaults
SOURCE_DB="edh_stats"
TARGET_DB="edh_stats"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_FILE="/backups/edh_stats_backup_${TIMESTAMP}.sql"
SKIP_IMPORT=false
SKIP_EXPORT=false

##############################################################################
# Helper Functions
##############################################################################

print_header() {
    echo -e "\n${BLUE}════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

show_help() {
    head -43 "$0" | tail -39
    exit 0
}

##############################################################################
# Argument Parsing
##############################################################################

while [[ $# -gt 0 ]]; do
    case $1 in
        --source-db)
            SOURCE_DB="$2"
            shift 2
            ;;
        --target-db)
            TARGET_DB="$2"
            shift 2
            ;;
        --output-file)
            OUTPUT_FILE="$2"
            shift 2
            ;;
        --skip-import)
            SKIP_IMPORT=true
            shift
            ;;
        --skip-export)
            SKIP_EXPORT=true
            shift
            ;;
        --help)
            show_help
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            ;;
    esac
done

##############################################################################
# Validation
##############################################################################

validate_environment() {
    print_header "Validating Environment"

    # Check if running in PostgreSQL container
    if ! command -v psql &> /dev/null; then
        print_error "psql is not available. This script must run inside the PostgreSQL container."
        exit 1
    fi
    print_success "Running inside PostgreSQL container"

    # Check if pg_dump is available
    if ! command -v pg_dump &> /dev/null; then
        print_error "pg_dump is not available in this container."
        exit 1
    fi
    print_success "pg_dump is available"

    # Check if psql is available
    if ! command -v psql &> /dev/null; then
        print_error "psql is not available in this container."
        exit 1
    fi
    print_success "psql is available"

    # Ensure /backups directory exists
    if [ ! -d "/backups" ]; then
        print_warning "/backups directory doesn't exist, creating it..."
        mkdir -p /backups
        if [ $? -eq 0 ]; then
            print_success "/backups directory created"
        else
            print_error "Failed to create /backups directory"
            exit 1
        fi
    fi
    print_success "/backups directory is ready"
}

validate_source_db() {
     print_header "Validating Source Database"

     print_info "Database: $SOURCE_DB"

     if psql -lqt | cut -d \| -f 1 | grep -qw "$SOURCE_DB"; then
         print_success "Source database exists"
     else
         print_error "Source database '$SOURCE_DB' does not exist"
         echo ""
         echo "Available databases:"
         psql -lqt | cut -d \| -f 1 | grep -v '^ *$'
         exit 1
     fi

     # Get database size
     local db_size=$(psql -t -c "SELECT pg_size_pretty(pg_database_size('$SOURCE_DB'))")
     print_info "Database size: $db_size"
}

validate_backup_file() {
     print_header "Validating Backup File"

     print_info "Backup file: $OUTPUT_FILE"

     if [ ! -f "$OUTPUT_FILE" ]; then
         print_error "Backup file not found: $OUTPUT_FILE"
         echo ""
         echo "Available backup files in /backups:"
         ls -lh /backups/ 2>/dev/null || echo "  (no backups found)"
         exit 1
     fi
     print_success "Backup file exists"

     # Get file size
     local file_size=$(du -h "$OUTPUT_FILE" | cut -f1)
     print_info "File size: $file_size"

     # Show line count
     local line_count=$(wc -l < "$OUTPUT_FILE")
     print_info "File lines: $line_count"
}

validate_target_db() {
    print_header "Validating Target Database"

    print_info "Database: $TARGET_DB"

    if psql -lqt | cut -d \| -f 1 | grep -qw "$TARGET_DB"; then
        print_success "Target database exists"
    else
        print_error "Target database '$TARGET_DB' does not exist"
        echo ""
        echo "Available databases:"
        psql -lqt | cut -d \| -f 1 | grep -v '^ *$'
        exit 1
    fi
}

##############################################################################
# Export Function
##############################################################################

export_database() {
     print_header "Exporting Source Database"

     print_info "Source database: $SOURCE_DB"
     print_info "Output file: $OUTPUT_FILE"
     print_info ""
     print_info "Exporting data (this may take a moment)..."

     if pg_dump -d "$SOURCE_DB" > "$OUTPUT_FILE" 2>&1; then
         print_success "Database exported successfully"
         
         # Get file size
         local file_size=$(du -h "$OUTPUT_FILE" | cut -f1)
         print_info "Export file size: $file_size"
         
         # Show line count
         local line_count=$(wc -l < "$OUTPUT_FILE")
         print_info "Export file lines: $line_count"
     else
         print_error "Failed to export database"
         exit 1
     fi
}

##############################################################################
# Clear Database Function
##############################################################################

clear_database() {
     print_header "Clearing Target Database"

     print_info "Database: $TARGET_DB"
     print_info ""
     print_info "Dropping all tables, views, and sequences..."

     # Drop all tables, views, and sequences
     if psql -d "$TARGET_DB" > /dev/null 2>&1 << EOF
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
EOF
     then
         print_success "Database cleared successfully"
     else
         print_error "Failed to clear database"
         exit 1
     fi
}

##############################################################################
# Clean Backup File Function (Remove pg_dump restrictions)
##############################################################################

clean_backup_file() {
     print_header "Preparing Backup File"

     print_info "Backup file: $OUTPUT_FILE"
     print_info ""
     print_info "Removing pg_dump restrictions and comments..."

     # Check if file has \restrict commands
     if grep -q "^\\\\restrict" "$OUTPUT_FILE"; then
         print_warning "Found pg_dump restrict commands - removing them..."
         
         # Create temporary cleaned file
         local temp_file="${OUTPUT_FILE}.tmp"
         
         # Remove \restrict and \unrestrict lines
         grep -v "^\\\\restrict\|^\\\\unrestrict" "$OUTPUT_FILE" > "$temp_file"
         
         if [ $? -eq 0 ]; then
             mv "$temp_file" "$OUTPUT_FILE"
             print_success "Backup file cleaned successfully"
         else
             rm -f "$temp_file"
             print_error "Failed to clean backup file"
             exit 1
         fi
     else
         print_success "Backup file is already clean"
     fi
}

##############################################################################
# Import Function
##############################################################################

import_database() {
     print_header "Importing to Target Database"

     if [ ! -f "$OUTPUT_FILE" ]; then
         print_error "Export file not found: $OUTPUT_FILE"
         exit 1
     fi

     print_info "Target database: $TARGET_DB"
     print_info "Source file: $OUTPUT_FILE"
     print_info ""
     print_warning "WARNING: This will DELETE all existing data in the target database!"
     echo ""
     read -p "Are you sure you want to continue? (yes/no): " -r confirm
     echo ""
     
     if [[ ! $confirm =~ ^[Yy][Ee][Ss]$ ]]; then
         print_warning "Import cancelled by user"
         exit 0
     fi

     # Clean backup file (remove restrict commands)
     clean_backup_file

     # Clear existing data
     clear_database

     print_info "Importing data (this may take a moment)..."

     if psql -d "$TARGET_DB" -f "$OUTPUT_FILE" > /dev/null 2>&1; then
         print_success "Database imported successfully"
     else
         print_error "Failed to import database"
         exit 1
     fi
}

##############################################################################
# Verification Function
##############################################################################

verify_import() {
    print_header "Verifying Data Import"

    print_info "Checking table counts..."

    # Get table counts from both databases
    local source_tables=$(psql -d "$SOURCE_DB" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
    local target_tables=$(psql -d "$TARGET_DB" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")

    print_info "Source tables: $source_tables"
    print_info "Target tables: $target_tables"

    if [ "$source_tables" -eq "$target_tables" ]; then
        print_success "Table counts match"
    else
        print_warning "Table counts differ (this might be OK if some tables are empty)"
    fi

    # Get row counts for main tables
    print_info ""
    print_info "Checking row counts..."

    local tables=("users" "commanders" "games")
    for table in "${tables[@]}"; do
        if psql -d "$SOURCE_DB" -t -c "SELECT 1 FROM information_schema.tables WHERE table_name = '$table';" | grep -q 1; then
            
            local source_rows=$(psql -d "$SOURCE_DB" -t -c "SELECT COUNT(*) FROM $table;")
            local target_rows=$(psql -d "$TARGET_DB" -t -c "SELECT COUNT(*) FROM $table;")

            if [ "$source_rows" -eq "$target_rows" ]; then
                print_success "Table '$table': $target_rows rows (✓ matches)"
            else
                print_warning "Table '$table': source=$source_rows, target=$target_rows"
            fi
        fi
    done
}

##############################################################################
# Summary Function
##############################################################################

print_summary() {
     print_header "Migration Summary"

     if [ "$SKIP_EXPORT" = true ]; then
         # Import-only mode summary
         echo "Mode: Import Only"
         echo ""
         echo "Source File:"
         echo "  Container path: $OUTPUT_FILE"
         echo "  Host path: ./backups/$(basename "$OUTPUT_FILE")"
         if [ -f "$OUTPUT_FILE" ]; then
             echo "  File size: $(du -h "$OUTPUT_FILE" | cut -f1)"
         fi
         echo ""
         echo "Target Database:"
         echo "  Name: $TARGET_DB"
         echo ""
         print_success "Data imported successfully!"
     else
         # Export (with or without import) summary
         echo "Source Database:"
         echo "  Name: $SOURCE_DB"
         echo ""
         echo "Target Database:"
         echo "  Name: $TARGET_DB"
         echo ""
         echo "Export File:"
         echo "  Container path: $OUTPUT_FILE"
         echo "  Host path: ./backups/$(basename "$OUTPUT_FILE")"
         if [ -f "$OUTPUT_FILE" ]; then
             echo "  File size: $(du -h "$OUTPUT_FILE" | cut -f1)"
         fi
         echo ""

         if [ "$SKIP_IMPORT" = true ]; then
             print_info "Export completed. Import was skipped."
             echo ""
             print_success "Backup file is available on your host at:"
             echo "  ./backups/$(basename "$OUTPUT_FILE")"
             echo ""
             echo "To import later, run:"
             echo "  docker compose exec -u postgres postgres /scripts/migrate-database.sh \\"
             echo "    --target-db $TARGET_DB \\"
             echo "    --output-file $OUTPUT_FILE \\"
             echo "    --skip-export"
         else
             print_success "Migration completed successfully!"
         fi
     fi
}

##############################################################################
# Main Execution
##############################################################################

main() {
     print_header "EDH Stats Tracker - Database Migration (Container)"

     # Check for conflicting flags
     if [ "$SKIP_IMPORT" = true ] && [ "$SKIP_EXPORT" = true ]; then
         print_error "Cannot use both --skip-import and --skip-export together"
         exit 1
     fi

     # Validate environment
     validate_environment

     # Validate based on mode
     if [ "$SKIP_EXPORT" = true ]; then
         # Import-only mode: validate backup file and target database
         validate_backup_file
         validate_target_db
     else
         # Export mode (with or without import)
         validate_source_db
         
         # Validate target database (if not skipping import)
         if [ "$SKIP_IMPORT" = false ]; then
             validate_target_db
         fi

         # Export database
         export_database
     fi

     # Import database (unless skipping export AND import)
     if [ "$SKIP_IMPORT" = false ]; then
         import_database
         verify_import
     fi

     # Print summary
     print_summary

     if [ "$SKIP_IMPORT" = false ] || [ "$SKIP_EXPORT" = true ]; then
         print_success "All done!"
     fi
}

# Run main function
main
