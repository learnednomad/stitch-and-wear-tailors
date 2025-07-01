#!/bin/bash

# Complete Remaining Collections Script
# Creates the remaining collections that weren't completed in the comprehensive setup

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '#' | awk '/=/ {print $1}')
fi

# Configuration
ENDPOINT=${APPWRITE_ENDPOINT:-"https://appwrite.learnednomad.com/v1"}
PROJECT_ID=${APPWRITE_PROJECT_ID:-"tm-saas"}
API_KEY=${APPWRITE_API_KEY}
DATABASE_ID="stitch-and-wear-db"

echo -e "${BLUE}🚀 Completing Remaining Appwrite Collections${NC}"
echo -e "${BLUE}📡 Endpoint: ${ENDPOINT}${NC}"
echo -e "${BLUE}🆔 Project: ${PROJECT_ID}${NC}"
echo -e "${BLUE}🗄️ Database: ${DATABASE_ID}${NC}"

# Initialize Appwrite CLI
echo -e "\n${YELLOW}🔧 Configuring Appwrite CLI...${NC}"
appwrite client --endpoint "$ENDPOINT" --project-id "$PROJECT_ID" --key "$API_KEY" > /dev/null 2>&1

# Function to create collection
create_collection() {
    local collection_id=$1
    local collection_name=$2
    local document_security=${3:-true}
    
    echo -e "\n${PURPLE}📁 Creating collection: ${collection_id}${NC}"
    appwrite databases create-collection \
        --database-id "$DATABASE_ID" \
        --collection-id "$collection_id" \
        --name "$collection_name" \
        --document-security "$document_security" \
        --enabled true \
        --permissions 'read("users")' 'create("users")' \
        || echo -e "${YELLOW}Collection ${collection_id} might already exist${NC}"
}

# Attribute creation functions
create_string_attr() {
    local collection_id=$1
    local key=$2
    local size=$3
    local required=${4:-false}
    local default_value=$5
    
    echo -e "  📝 Creating string attribute: ${key}"
    if [ -n "$default_value" ] && [ "$required" = "false" ]; then
        appwrite databases create-string-attribute \
            --database-id "$DATABASE_ID" \
            --collection-id "$collection_id" \
            --key "$key" \
            --size "$size" \
            --required "$required" \
            --xdefault "$default_value" \
            2>/dev/null || echo -e "    ${YELLOW}Attribute ${key} might already exist${NC}"
    else
        appwrite databases create-string-attribute \
            --database-id "$DATABASE_ID" \
            --collection-id "$collection_id" \
            --key "$key" \
            --size "$size" \
            --required "$required" \
            2>/dev/null || echo -e "    ${YELLOW}Attribute ${key} might already exist${NC}"
    fi
}

create_enum_attr() {
    local collection_id=$1
    local key=$2
    local elements=$3
    local required=${4:-false}
    local default_value=$5
    
    echo -e "  🔢 Creating enum attribute: ${key}"
    if [ -n "$default_value" ] && [ "$required" = "false" ]; then
        appwrite databases create-enum-attribute \
            --database-id "$DATABASE_ID" \
            --collection-id "$collection_id" \
            --key "$key" \
            --elements $elements \
            --required "$required" \
            --xdefault "$default_value" \
            2>/dev/null || echo -e "    ${YELLOW}Attribute ${key} might already exist${NC}"
    else
        appwrite databases create-enum-attribute \
            --database-id "$DATABASE_ID" \
            --collection-id "$collection_id" \
            --key "$key" \
            --elements $elements \
            --required "$required" \
            2>/dev/null || echo -e "    ${YELLOW}Attribute ${key} might already exist${NC}"
    fi
}

create_float_attr() {
    local collection_id=$1
    local key=$2
    local required=${3:-false}
    local min=$4
    
    echo -e "  🔢 Creating float attribute: ${key}"
    if [ -n "$min" ]; then
        appwrite databases create-float-attribute \
            --database-id "$DATABASE_ID" \
            --collection-id "$collection_id" \
            --key "$key" \
            --required "$required" \
            --min "$min" \
            2>/dev/null || echo -e "    ${YELLOW}Attribute ${key} might already exist${NC}"
    else
        appwrite databases create-float-attribute \
            --database-id "$DATABASE_ID" \
            --collection-id "$collection_id" \
            --key "$key" \
            --required "$required" \
            2>/dev/null || echo -e "    ${YELLOW}Attribute ${key} might already exist${NC}"
    fi
}

create_int_attr() {
    local collection_id=$1
    local key=$2
    local required=${3:-false}
    local min=$4
    local max=$5
    local default_value=$6
    
    echo -e "  🔢 Creating integer attribute: ${key}"
    cmd="appwrite databases create-integer-attribute --database-id '$DATABASE_ID' --collection-id '$collection_id' --key '$key' --required '$required'"
    
    if [ -n "$min" ]; then
        cmd="$cmd --min $min"
    fi
    if [ -n "$max" ]; then
        cmd="$cmd --max $max"
    fi
    if [ -n "$default_value" ] && [ "$required" = "false" ]; then
        cmd="$cmd --xdefault $default_value"
    fi
    
    eval "$cmd" 2>/dev/null || echo -e "    ${YELLOW}Attribute ${key} might already exist${NC}"
}

create_datetime_attr() {
    local collection_id=$1
    local key=$2
    local required=${3:-false}
    
    echo -e "  📅 Creating datetime attribute: ${key}"
    appwrite databases create-datetime-attribute \
        --database-id "$DATABASE_ID" \
        --collection-id "$collection_id" \
        --key "$key" \
        --required "$required" \
        2>/dev/null || echo -e "    ${YELLOW}Attribute ${key} might already exist${NC}"
}

create_ip_attr() {
    local collection_id=$1
    local key=$2
    local required=${3:-false}
    
    echo -e "  🌐 Creating IP attribute: ${key}"
    appwrite databases create-ip-attribute \
        --database-id "$DATABASE_ID" \
        --collection-id "$collection_id" \
        --key "$key" \
        --required "$required" \
        2>/dev/null || echo -e "    ${YELLOW}Attribute ${key} might already exist${NC}"
}

create_url_attr() {
    local collection_id=$1
    local key=$2
    local required=${3:-false}
    
    echo -e "  🔗 Creating URL attribute: ${key}"
    appwrite databases create-url-attribute \
        --database-id "$DATABASE_ID" \
        --collection-id "$collection_id" \
        --key "$key" \
        --required "$required" \
        2>/dev/null || echo -e "    ${YELLOW}Attribute ${key} might already exist${NC}"
}

create_bool_attr() {
    local collection_id=$1
    local key=$2
    local required=${3:-false}
    local default_value=$4
    
    echo -e "  ✅ Creating boolean attribute: ${key}"
    if [ -n "$default_value" ] && [ "$required" = "false" ]; then
        appwrite databases create-boolean-attribute \
            --database-id "$DATABASE_ID" \
            --collection-id "$collection_id" \
            --key "$key" \
            --required "$required" \
            --xdefault "$default_value" \
            2>/dev/null || echo -e "    ${YELLOW}Attribute ${key} might already exist${NC}"
    else
        appwrite databases create-boolean-attribute \
            --database-id "$DATABASE_ID" \
            --collection-id "$collection_id" \
            --key "$key" \
            --required "$required" \
            2>/dev/null || echo -e "    ${YELLOW}Attribute ${key} might already exist${NC}"
    fi
}

create_index() {
    local collection_id=$1
    local key=$2
    local type=$3
    shift 3
    local attributes=("$@")
    
    echo -e "  🗂️ Creating index: ${key}"
    appwrite databases create-index \
        --database-id "$DATABASE_ID" \
        --collection-id "$collection_id" \
        --key "$key" \
        --type "$type" \
        --attributes "${attributes[@]}" \
        2>/dev/null || echo -e "    ${YELLOW}Index ${key} might already exist${NC}"
}

# Wait function for attributes to be ready
wait_for_attributes() {
    echo -e "\n${YELLOW}⏳ Waiting for attributes to be ready...${NC}"
    sleep 3
}

# Main function to complete remaining collections
complete_remaining_collections() {
    echo -e "\n${GREEN}🔄 Completing remaining collections...${NC}"
    
    # ==========================================
    # COMMUNICATION & COLLABORATION (remaining)
    # ==========================================
    
    echo -e "\n${GREEN}💬 Completing Communication & Collaboration collections...${NC}"
    
    # Notifications Queue collection (if not complete)
    create_collection "notifications_queue" "Notification Queue" true
    sleep 2
    create_string_attr "notifications_queue" "userId" 255 true
    create_enum_attr "notifications_queue" "type" "order_update,appointment_reminder,payment_due,promotion,system,message" true
    create_enum_attr "notifications_queue" "channel" "in_app,email,sms,push" true
    create_enum_attr "notifications_queue" "priority" "low,normal,high,urgent" true "normal"
    create_string_attr "notifications_queue" "title" 255 true
    create_string_attr "notifications_queue" "message" 2000 true
    create_string_attr "notifications_queue" "data" 5000 false
    create_string_attr "notifications_queue" "actionUrl" 500 false
    create_enum_attr "notifications_queue" "status" "pending,sent,delivered,failed,cancelled" true "pending"
    create_datetime_attr "notifications_queue" "scheduledFor" false
    create_datetime_attr "notifications_queue" "sentAt" false
    create_datetime_attr "notifications_queue" "deliveredAt" false
    create_datetime_attr "notifications_queue" "readAt" false
    create_string_attr "notifications_queue" "failureReason" 500 false
    create_int_attr "notifications_queue" "retryCount" false "" "" "0"
    create_datetime_attr "notifications_queue" "createdAt" false
    
    wait_for_attributes
    create_index "notifications_queue" "notif_user" "key" "userId"
    create_index "notifications_queue" "notif_status" "key" "status"
    create_index "notifications_queue" "notif_type" "key" "type"
    create_index "notifications_queue" "notif_scheduled" "key" "scheduledFor"
    create_index "notifications_queue" "notif_priority" "key" "priority"

    # ==========================================
    # BUSINESS INTELLIGENCE & ANALYTICS
    # ==========================================
    
    echo -e "\n${GREEN}📊 Setting up Business Intelligence & Analytics collections...${NC}"
    
    # KPI Metrics collection
    create_collection "kpi_metrics" "KPI Metrics" false
    sleep 2
    create_string_attr "kpi_metrics" "locationId" 255 false
    create_enum_attr "kpi_metrics" "metricType" "revenue,orders,clients,inventory,quality,efficiency" true
    create_string_attr "kpi_metrics" "metricName" 100 true
    create_float_attr "kpi_metrics" "value" true
    create_string_attr "kpi_metrics" "unit" 20 false
    create_enum_attr "kpi_metrics" "period" "daily,weekly,monthly,quarterly,yearly" true
    create_datetime_attr "kpi_metrics" "periodStart" true
    create_datetime_attr "kpi_metrics" "periodEnd" true
    create_float_attr "kpi_metrics" "previousValue" false
    create_float_attr "kpi_metrics" "target" false
    create_enum_attr "kpi_metrics" "trend" "up,down,stable" false
    create_float_attr "kpi_metrics" "percentageChange" false
    create_string_attr "kpi_metrics" "metadata" 2000 false
    create_datetime_attr "kpi_metrics" "calculatedAt" true
    create_datetime_attr "kpi_metrics" "createdAt" false
    
    wait_for_attributes
    create_index "kpi_metrics" "kpi_location" "key" "locationId"
    create_index "kpi_metrics" "kpi_type" "key" "metricType"
    create_index "kpi_metrics" "kpi_name" "key" "metricName"
    create_index "kpi_metrics" "kpi_calculated" "key" "calculatedAt"
    
    # AI Insights collection
    create_collection "ai_insights" "AI Generated Insights" false
    sleep 2
    create_enum_attr "ai_insights" "insightType" "revenue_optimization,operational_efficiency,client_satisfaction,inventory_management,growth_opportunity,risk_alert" true
    create_string_attr "ai_insights" "category" 100 true
    create_string_attr "ai_insights" "title" 500 true
    create_string_attr "ai_insights" "summary" 2000 true
    create_string_attr "ai_insights" "analysis" 10000 true
    create_float_attr "ai_insights" "confidence" true "0"
    create_enum_attr "ai_insights" "priority" "low,medium,high,critical" true
    create_enum_attr "ai_insights" "status" "new,reviewed,actioned,dismissed" true "new"
    create_string_attr "ai_insights" "locationId" 255 false
    create_datetime_attr "ai_insights" "validFrom" true
    create_datetime_attr "ai_insights" "validUntil" false
    create_string_attr "ai_insights" "generatedBy" 100 true "claude-ai"
    create_string_attr "ai_insights" "reviewedBy" 255 false
    create_datetime_attr "ai_insights" "reviewedAt" false
    create_string_attr "ai_insights" "actionTaken" 2000 false
    create_datetime_attr "ai_insights" "createdAt" false
    
    wait_for_attributes
    create_index "ai_insights" "insight_type" "key" "insightType"
    create_index "ai_insights" "insight_category" "key" "category"
    create_index "ai_insights" "insight_priority" "key" "priority"
    create_index "ai_insights" "insight_status" "key" "status"
    create_index "ai_insights" "insight_location" "key" "locationId"

    # ==========================================
    # AUDIT & SECURITY
    # ==========================================
    
    echo -e "\n${GREEN}🔒 Setting up Audit & Security collections...${NC}"
    
    # Audit Logs collection
    create_collection "audit_logs" "Audit Logs" false
    sleep 2
    create_string_attr "audit_logs" "userId" 255 true
    create_string_attr "audit_logs" "action" 100 true
    create_string_attr "audit_logs" "resource" 100 true
    create_string_attr "audit_logs" "resourceId" 100 false
    create_string_attr "audit_logs" "changes" 10000 false
    create_ip_attr "audit_logs" "ipAddress" false
    create_string_attr "audit_logs" "userAgent" 500 false
    create_string_attr "audit_logs" "locationId" 255 false
    create_enum_attr "audit_logs" "severity" "info,warning,error,critical" true "info"
    create_string_attr "audit_logs" "metadata" 2000 false
    create_datetime_attr "audit_logs" "timestamp" true
    
    wait_for_attributes
    create_index "audit_logs" "audit_user" "key" "userId"
    create_index "audit_logs" "audit_action" "key" "action"
    create_index "audit_logs" "audit_resource" "key" "resource"
    create_index "audit_logs" "audit_timestamp" "key" "timestamp"
    create_index "audit_logs" "audit_severity" "key" "severity"
    
    # Security Events collection
    create_collection "security_events" "Security Events" false
    sleep 2
    create_enum_attr "security_events" "eventType" "login_success,login_failure,password_reset,permission_change,suspicious_activity,data_export,api_limit_exceeded" true
    create_string_attr "security_events" "userId" 255 false
    create_ip_attr "security_events" "ipAddress" false
    create_string_attr "security_events" "userAgent" 500 false
    create_string_attr "security_events" "details" 2000 false
    create_int_attr "security_events" "riskScore" false "0" "100"
    create_bool_attr "security_events" "blocked" false "false"
    create_datetime_attr "security_events" "timestamp" true
    
    wait_for_attributes
    create_index "security_events" "security_type" "key" "eventType"
    create_index "security_events" "security_user" "key" "userId"
    create_index "security_events" "security_timestamp" "key" "timestamp"
    create_index "security_events" "security_risk" "key" "riskScore"

    # ==========================================
    # REPORTING & EXPORTS
    # ==========================================
    
    echo -e "\n${GREEN}📈 Setting up Reporting & Exports collections...${NC}"
    
    # Scheduled Reports collection
    create_collection "scheduled_reports" "Scheduled Reports" false
    sleep 2
    create_string_attr "scheduled_reports" "name" 255 true
    create_string_attr "scheduled_reports" "description" 1000 false
    create_enum_attr "scheduled_reports" "reportType" "financial,operational,inventory,customer,custom" true
    create_string_attr "scheduled_reports" "parameters" 5000 true
    create_string_attr "scheduled_reports" "schedule" 100 true
    create_enum_attr "scheduled_reports" "format" "pdf,excel,csv,json" true "pdf"
    create_string_attr "scheduled_reports" "locationId" 255 false
    create_bool_attr "scheduled_reports" "isActive" true "true"
    create_datetime_attr "scheduled_reports" "lastRunAt" false
    create_enum_attr "scheduled_reports" "lastRunStatus" "success,failure,running" false
    create_datetime_attr "scheduled_reports" "nextRunAt" false
    create_string_attr "scheduled_reports" "createdBy" 255 false
    create_datetime_attr "scheduled_reports" "createdAt" false
    create_datetime_attr "scheduled_reports" "updatedAt" false
    
    wait_for_attributes
    create_index "scheduled_reports" "report_type" "key" "reportType"
    create_index "scheduled_reports" "report_active" "key" "isActive"
    create_index "scheduled_reports" "report_next_run" "key" "nextRunAt"
    create_index "scheduled_reports" "report_location" "key" "locationId"
    
    # Report History collection
    create_collection "report_history" "Report History" false
    sleep 2
    create_string_attr "report_history" "scheduledReportId" 255 true
    create_enum_attr "report_history" "status" "pending,generating,completed,failed" true
    create_url_attr "report_history" "fileUrl" false
    create_int_attr "report_history" "fileSize" false
    create_int_attr "report_history" "generationTime" false
    create_string_attr "report_history" "error" 2000 false
    create_datetime_attr "report_history" "generatedAt" true
    create_datetime_attr "report_history" "expiresAt" false
    
    wait_for_attributes
    create_index "report_history" "history_report" "key" "scheduledReportId"
    create_index "report_history" "history_status" "key" "status"
    create_index "report_history" "history_generated" "key" "generatedAt"
    create_index "report_history" "history_expires" "key" "expiresAt"
    
    echo -e "\n${GREEN}✅ Remaining collections setup completed successfully!${NC}"
    echo -e "\n${BLUE}📊 Additional Collections Added:${NC}"
    echo -e "  - Analytics: kpi_metrics, ai_insights"
    echo -e "  - Security: audit_logs, security_events"
    echo -e "  - Reporting: scheduled_reports, report_history"
    echo -e "\n${GREEN}🎉 Your comprehensive database is now fully complete!${NC}"
}

# Run the completion
complete_remaining_collections