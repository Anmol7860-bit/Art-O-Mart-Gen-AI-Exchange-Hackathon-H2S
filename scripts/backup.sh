#!/bin/bash

# Art-O-Mart Database Backup Script
# Automated backup solution for production database

set -e

# Configuration
BACKUP_DIR="/backups"
RETENTION_DAYS=30
S3_BUCKET="${AWS_S3_BACKUP_BUCKET}"
DATABASE_URL="${DATABASE_URL}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-artomart}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD}"

# Timestamp for backup files
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE_ONLY=$(date +%Y%m%d)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log "Checking backup prerequisites..."
    
    # Check if required tools are installed
    command -v pg_dump >/dev/null 2>&1 || error "pg_dump is required but not installed"
    command -v gzip >/dev/null 2>&1 || error "gzip is required but not installed"
    
    # Check if AWS CLI is available for S3 upload
    if [ -n "$S3_BUCKET" ]; then
        command -v aws >/dev/null 2>&1 || error "AWS CLI is required for S3 backup but not installed"
    fi
    
    # Check if backup directory exists
    if [ ! -d "$BACKUP_DIR" ]; then
        info "Creating backup directory: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
    fi
    
    # Check database connectivity
    if ! PGPASSWORD="$POSTGRES_PASSWORD" pg_isready -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER >/dev/null 2>&1; then
        error "Cannot connect to PostgreSQL database"
    fi
    
    log "Prerequisites check completed ✓"
}

# Create database backup
create_database_backup() {
    log "Creating database backup..."
    
    local backup_file="$BACKUP_DIR/artomart_db_${TIMESTAMP}.sql"
    local compressed_file="${backup_file}.gz"
    
    # Set PostgreSQL password
    export PGPASSWORD="$POSTGRES_PASSWORD"
    
    # Create backup with verbose output
    info "Backing up database $POSTGRES_DB..."
    pg_dump -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER \
            --verbose --clean --if-exists --create \
            --format=plain --encoding=UTF8 \
            $POSTGRES_DB > "$backup_file" 2>&1
    
    if [ $? -eq 0 ]; then
        log "Database dump created successfully"
    else
        error "Database dump failed"
    fi
    
    # Compress backup
    info "Compressing backup..."
    gzip "$backup_file"
    
    if [ -f "$compressed_file" ]; then
        local file_size=$(du -sh "$compressed_file" | cut -f1)
        log "Compressed backup created: $(basename $compressed_file) ($file_size)"
        echo "$compressed_file"
    else
        error "Backup compression failed"
    fi
}

# Create schema-only backup
create_schema_backup() {
    log "Creating schema-only backup..."
    
    local schema_file="$BACKUP_DIR/artomart_schema_${TIMESTAMP}.sql"
    local compressed_file="${schema_file}.gz"
    
    export PGPASSWORD="$POSTGRES_PASSWORD"
    
    # Create schema backup
    pg_dump -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER \
            --schema-only --verbose --clean --if-exists --create \
            --format=plain --encoding=UTF8 \
            $POSTGRES_DB > "$schema_file" 2>&1
    
    if [ $? -eq 0 ]; then
        gzip "$schema_file"
        local file_size=$(du -sh "$compressed_file" | cut -f1)
        log "Schema backup created: $(basename $compressed_file) ($file_size)"
        echo "$compressed_file"
    else
        warning "Schema backup failed"
    fi
}

# Create data-only backup
create_data_backup() {
    log "Creating data-only backup..."
    
    local data_file="$BACKUP_DIR/artomart_data_${TIMESTAMP}.sql"
    local compressed_file="${data_file}.gz"
    
    export PGPASSWORD="$POSTGRES_PASSWORD"
    
    # Create data backup
    pg_dump -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER \
            --data-only --verbose --disable-triggers \
            --format=plain --encoding=UTF8 \
            $POSTGRES_DB > "$data_file" 2>&1
    
    if [ $? -eq 0 ]; then
        gzip "$data_file"
        local file_size=$(du -sh "$compressed_file" | cut -f1)
        log "Data backup created: $(basename $compressed_file) ($file_size)"
        echo "$compressed_file"
    else
        warning "Data backup failed"
    fi
}

# Upload backup to S3
upload_to_s3() {
    local file_path=$1
    local file_name=$(basename "$file_path")
    
    if [ -z "$S3_BUCKET" ]; then
        info "S3 bucket not configured, skipping cloud upload"
        return
    fi
    
    log "Uploading backup to S3..."
    
    local s3_path="s3://$S3_BUCKET/database-backups/$DATE_ONLY/$file_name"
    
    if aws s3 cp "$file_path" "$s3_path" --storage-class STANDARD_IA; then
        log "Backup uploaded to S3: $s3_path"
        
        # Add metadata
        aws s3api put-object-tagging \
            --bucket "$S3_BUCKET" \
            --key "database-backups/$DATE_ONLY/$file_name" \
            --tagging 'TagSet=[{Key=BackupType,Value=Database},{Key=Environment,Value=Production},{Key=Application,Value=ArtOMart}]'
    else
        error "Failed to upload backup to S3"
    fi
}

# Verify backup integrity
verify_backup() {
    local backup_file=$1
    
    log "Verifying backup integrity..."
    
    # Check if file exists and is not empty
    if [ ! -f "$backup_file" ] || [ ! -s "$backup_file" ]; then
        error "Backup file is missing or empty"
    fi
    
    # Check if gzip file is valid
    if ! gzip -t "$backup_file" >/dev/null 2>&1; then
        error "Backup file is corrupted (gzip test failed)"
    fi
    
    # Basic content verification
    local content_check=$(zcat "$backup_file" | head -20 | grep -c "PostgreSQL database dump" || true)
    if [ "$content_check" -eq 0 ]; then
        warning "Backup file may not contain valid PostgreSQL dump"
    else
        log "Backup integrity verified ✓"
    fi
}

# Clean up old backups
cleanup_old_backups() {
    log "Cleaning up old backups..."
    
    # Remove local backups older than retention period
    find "$BACKUP_DIR" -name "artomart_*.sql.gz" -mtime +$RETENTION_DAYS -delete
    
    local removed_count=$(find "$BACKUP_DIR" -name "artomart_*.sql.gz" -mtime +$RETENTION_DAYS 2>/dev/null | wc -l)
    if [ $removed_count -gt 0 ]; then
        log "Removed $removed_count old local backups"
    fi
    
    # Clean up S3 backups if configured
    if [ -n "$S3_BUCKET" ]; then
        info "Cleaning up old S3 backups..."
        
        # List and delete backups older than retention period
        local cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y%m%d)
        
        aws s3 ls "s3://$S3_BUCKET/database-backups/" --recursive | while read -r line; do
            local s3_date=$(echo "$line" | awk '{print $1}' | tr -d '-')
            local s3_key=$(echo "$line" | awk '{print $4}')
            
            if [[ "$s3_date" < "$cutoff_date" ]]; then
                aws s3 rm "s3://$S3_BUCKET/$s3_key"
                info "Removed old S3 backup: $s3_key"
            fi
        done
    fi
    
    log "Cleanup completed"
}

# Create backup manifest
create_backup_manifest() {
    local backup_files=("$@")
    
    local manifest_file="$BACKUP_DIR/backup_manifest_${TIMESTAMP}.json"
    
    cat > "$manifest_file" << EOF
{
    "timestamp": "$(date -Iseconds)",
    "database": "$POSTGRES_DB",
    "host": "$POSTGRES_HOST",
    "port": $POSTGRES_PORT,
    "user": "$POSTGRES_USER",
    "backup_files": [
$(printf '        "%s"' "${backup_files[0]}")
$(for file in "${backup_files[@]:1}"; do printf ',\n        "%s"' "$file"; done)
    ],
    "retention_days": $RETENTION_DAYS,
    "s3_bucket": "$S3_BUCKET",
    "checksum": {
$(for file in "${backup_files[@]}"; do
    if [ -f "$file" ]; then
        local filename=$(basename "$file")
        local checksum=$(sha256sum "$file" | cut -d' ' -f1)
        printf '        "%s": "%s"' "$filename" "$checksum"
        if [ "$file" != "${backup_files[-1]}" ]; then printf ','; fi
        printf '\n'
    fi
done)
    }
}
EOF
    
    log "Backup manifest created: $(basename $manifest_file)"
}

# Send backup notifications
send_notifications() {
    local backup_files=("$@")
    local total_size=0
    
    # Calculate total backup size
    for file in "${backup_files[@]}"; do
        if [ -f "$file" ]; then
            local size=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file" 2>/dev/null || echo 0)
            total_size=$((total_size + size))
        fi
    done
    
    local human_size=$(numfmt --to=iec-i --suffix=B $total_size 2>/dev/null || echo "${total_size} bytes")
    
    # Create notification message
    local message="🗄️ Art-O-Mart Database Backup Completed
Timestamp: $TIMESTAMP
Database: $POSTGRES_DB
Backup Files: ${#backup_files[@]}
Total Size: $human_size
S3 Upload: $([ -n "$S3_BUCKET" ] && echo "✅ Enabled" || echo "❌ Disabled")
Status: ✅ Success"
    
    # Send to webhook if configured
    if [ -n "$WEBHOOK_URL" ]; then
        curl -X POST -H "Content-Type: application/json" \
             -d "{\"text\":\"$message\"}" \
             "$WEBHOOK_URL" || warning "Failed to send webhook notification"
    fi
    
    # Send email if configured
    if [ -n "$NOTIFICATION_EMAIL" ]; then
        echo "$message" | mail -s "Database Backup Success - Art-O-Mart" "$NOTIFICATION_EMAIL" || warning "Failed to send email notification"
    fi
    
    log "Notifications sent"
}

# Test backup restore (dry run)
test_backup_restore() {
    local backup_file=$1
    
    log "Testing backup restore (dry run)..."
    
    # Create temporary database for testing
    local test_db="artomart_test_restore_$$"
    
    export PGPASSWORD="$POSTGRES_PASSWORD"
    
    # Create test database
    createdb -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER "$test_db"
    
    # Attempt to restore backup
    if zcat "$backup_file" | psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d "$test_db" >/dev/null 2>&1; then
        log "Backup restore test successful ✓"
        
        # Verify some basic tables exist
        local table_count=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d "$test_db" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs)
        info "Restored database contains $table_count tables"
    else
        warning "Backup restore test failed"
    fi
    
    # Clean up test database
    dropdb -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER "$test_db" 2>/dev/null || true
}

# Main backup function
main() {
    log "Starting database backup process..."
    
    # Load environment variables
    if [ -f ".env.production" ]; then
        export $(cat .env.production | grep -v ^# | xargs) 2>/dev/null || true
    fi
    
    check_prerequisites
    
    # Create different types of backups
    local backup_files=()
    
    # Full backup
    local full_backup=$(create_database_backup)
    backup_files+=("$full_backup")
    verify_backup "$full_backup"
    
    # Schema backup
    local schema_backup=$(create_schema_backup)
    if [ -n "$schema_backup" ]; then
        backup_files+=("$schema_backup")
    fi
    
    # Data backup
    local data_backup=$(create_data_backup)
    if [ -n "$data_backup" ]; then
        backup_files+=("$data_backup")
    fi
    
    # Upload to S3
    for backup_file in "${backup_files[@]}"; do
        if [ -f "$backup_file" ]; then
            upload_to_s3 "$backup_file"
        fi
    done
    
    # Test restore
    test_backup_restore "$full_backup"
    
    # Create manifest
    create_backup_manifest "${backup_files[@]}"
    
    # Send notifications
    send_notifications "${backup_files[@]}"
    
    # Cleanup old backups
    cleanup_old_backups
    
    log "🎉 Database backup completed successfully!"
    log "Backup files created: ${#backup_files[@]}"
}

# Handle command line arguments
case "${1:-full}" in
    "full")
        main
        ;;
    "schema")
        check_prerequisites
        create_schema_backup
        ;;
    "data")
        check_prerequisites
        create_data_backup
        ;;
    "cleanup")
        cleanup_old_backups
        ;;
    "verify")
        if [ -z "$2" ]; then
            error "Please specify backup file to verify"
        fi
        verify_backup "$2"
        ;;
    "restore-test")
        if [ -z "$2" ]; then
            error "Please specify backup file to test"
        fi
        test_backup_restore "$2"
        ;;
    *)
        echo "Usage: $0 {full|schema|data|cleanup|verify|restore-test}"
        echo "  full         - Create full database backup (default)"
        echo "  schema       - Create schema-only backup"
        echo "  data         - Create data-only backup"
        echo "  cleanup      - Remove old backups"
        echo "  verify FILE  - Verify backup file integrity"
        echo "  restore-test FILE - Test backup restore"
        exit 1
        ;;
esac