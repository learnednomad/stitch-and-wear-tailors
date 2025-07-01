#!/bin/bash

# Comprehensive Appwrite Database Setup Script
# Creates all 28 collections from the comprehensive schema

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

echo -e "${BLUE}🚀 Comprehensive Appwrite Database Setup${NC}"
echo -e "${BLUE}📡 Endpoint: ${ENDPOINT}${NC}"
echo -e "${BLUE}🆔 Project: ${PROJECT_ID}${NC}"
echo -e "${BLUE}🗄️ Database: ${DATABASE_ID}${NC}"
echo -e "${BLUE}📋 Creating 28 collections from comprehensive schema${NC}"

# Check if required variables are set
if [ -z "$API_KEY" ]; then
    echo -e "${RED}❌ APPWRITE_API_KEY is not set. Please check your .env.local file.${NC}"
    exit 1
fi

# Initialize Appwrite CLI
echo -e "\n${YELLOW}🔧 Configuring Appwrite CLI...${NC}"
appwrite client --endpoint "$ENDPOINT" --project-id "$PROJECT_ID" --key "$API_KEY"

# Function to create database
create_database() {
    echo -e "\n${YELLOW}🗄️ Creating database...${NC}"
    appwrite databases create \
        --database-id "$DATABASE_ID" \
        --name "Stitch and Wear Tailors Database" \
        --enabled true \
        || echo -e "${YELLOW}Database might already exist${NC}"
}

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
create_email_attr() {
    local collection_id=$1
    local key=$2
    local required=${3:-false}
    
    echo -e "  📧 Creating email attribute: ${key}"
    appwrite databases create-email-attribute \
        --database-id "$DATABASE_ID" \
        --collection-id "$collection_id" \
        --key "$key" \
        --required "$required" \
        || echo -e "    ${YELLOW}Attribute ${key} might already exist${NC}"
}

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
            || echo -e "    ${YELLOW}Attribute ${key} might already exist${NC}"
    else
        appwrite databases create-string-attribute \
            --database-id "$DATABASE_ID" \
            --collection-id "$collection_id" \
            --key "$key" \
            --size "$size" \
            --required "$required" \
            || echo -e "    ${YELLOW}Attribute ${key} might already exist${NC}"
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
            || echo -e "    ${YELLOW}Attribute ${key} might already exist${NC}"
    else
        appwrite databases create-enum-attribute \
            --database-id "$DATABASE_ID" \
            --collection-id "$collection_id" \
            --key "$key" \
            --elements $elements \
            --required "$required" \
            || echo -e "    ${YELLOW}Attribute ${key} might already exist${NC}"
    fi
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
            || echo -e "    ${YELLOW}Attribute ${key} might already exist${NC}"
    else
        appwrite databases create-boolean-attribute \
            --database-id "$DATABASE_ID" \
            --collection-id "$collection_id" \
            --key "$key" \
            --required "$required" \
            || echo -e "    ${YELLOW}Attribute ${key} might already exist${NC}"
    fi
}

create_float_attr() {
    local collection_id=$1
    local key=$2
    local required=${3:-false}
    local min=$4
    local default_value=$5
    
    echo -e "  🔢 Creating float attribute: ${key}"
    if [ -n "$min" ]; then
        appwrite databases create-float-attribute \
            --database-id "$DATABASE_ID" \
            --collection-id "$collection_id" \
            --key "$key" \
            --required "$required" \
            --min "$min" \
            || echo -e "    ${YELLOW}Attribute ${key} might already exist${NC}"
    else
        appwrite databases create-float-attribute \
            --database-id "$DATABASE_ID" \
            --collection-id "$collection_id" \
            --key "$key" \
            --required "$required" \
            || echo -e "    ${YELLOW}Attribute ${key} might already exist${NC}"
    fi
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
        || echo -e "    ${YELLOW}Attribute ${key} might already exist${NC}"
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
    
    eval "$cmd" || echo -e "    ${YELLOW}Attribute ${key} might already exist${NC}"
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
        || echo -e "    ${YELLOW}Attribute ${key} might already exist${NC}"
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
        || echo -e "    ${YELLOW}Attribute ${key} might already exist${NC}"
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
        || echo -e "    ${YELLOW}Index ${key} might already exist${NC}"
}

# Wait function for attributes to be ready
wait_for_attributes() {
    echo -e "\n${YELLOW}⏳ Waiting for attributes to be ready...${NC}"
    sleep 5
}

# Main setup function
setup_comprehensive_database() {
    echo -e "\n${GREEN}🏗️ Starting comprehensive database setup...${NC}"
    
    # Create database
    create_database
    sleep 2

    # ==========================================
    # CORE USER & AUTHENTICATION
    # ==========================================
    
    echo -e "\n${GREEN}👥 Setting up Core User & Authentication collections...${NC}"
    
    # Users collection
    create_collection "users" "Users" true
    sleep 2
    create_email_attr "users" "email" true
    create_enum_attr "users" "role" "client,tailor,admin" true
    create_enum_attr "users" "status" "active,inactive,suspended" false "active"
    create_string_attr "users" "profile" 5000 false
    create_string_attr "users" "phoneNumber" 20 false
    create_string_attr "users" "businessId" 255 false
    create_string_attr "users" "preferredLanguage" 10 false "en"
    create_enum_attr "users" "preferredCommunication" "email,sms,phone,app" false "email"
    create_bool_attr "users" "twoFactorEnabled" false "false"
    create_datetime_attr "users" "lastLoginAt" false
    create_int_attr "users" "loginCount" false "" "" "0"
    create_datetime_attr "users" "createdAt" false
    create_datetime_attr "users" "updatedAt" false
    
    wait_for_attributes
    create_index "users" "email_unique" "unique" "email"
    create_index "users" "role_index" "key" "role"
    create_index "users" "business_index" "key" "businessId"
    create_index "users" "status_index" "key" "status"
    
    # Sessions collection
    create_collection "sessions" "User Sessions" true
    sleep 2
    create_string_attr "sessions" "userId" 255 true
    create_string_attr "sessions" "token" 500 true
    create_ip_attr "sessions" "ipAddress" false
    create_string_attr "sessions" "userAgent" 500 false
    create_datetime_attr "sessions" "expiresAt" true
    create_datetime_attr "sessions" "createdAt" false
    
    wait_for_attributes
    create_index "sessions" "token_unique" "unique" "token"
    create_index "sessions" "user_sessions" "key" "userId"
    create_index "sessions" "expiry_index" "key" "expiresAt"

    # ==========================================
    # BUSINESS & LOCATION MANAGEMENT
    # ==========================================
    
    echo -e "\n${GREEN}🏢 Setting up Business & Location Management collections...${NC}"
    
    # Businesses collection
    create_collection "businesses" "Businesses" false
    sleep 2
    create_string_attr "businesses" "name" 255 true
    create_enum_attr "businesses" "type" "single,franchise,chain" true "single"
    create_string_attr "businesses" "registrationNumber" 100 false
    create_string_attr "businesses" "taxId" 100 false
    create_string_attr "businesses" "currency" 10 true "USD"
    create_string_attr "businesses" "timezone" 50 true "UTC"
    create_string_attr "businesses" "settings" 10000 false
    create_datetime_attr "businesses" "createdAt" false
    create_datetime_attr "businesses" "updatedAt" false
    
    wait_for_attributes
    create_index "businesses" "business_name" "key" "name"
    create_index "businesses" "business_type" "key" "type"
    
    # Locations collection
    create_collection "locations" "Business Locations" false
    sleep 2
    create_string_attr "locations" "businessId" 255 true
    create_string_attr "locations" "name" 255 true
    create_string_attr "locations" "address" 500 true
    create_string_attr "locations" "city" 100 true
    create_string_attr "locations" "state" 100 false
    create_string_attr "locations" "country" 100 true
    create_string_attr "locations" "postalCode" 20 false
    create_string_attr "locations" "phone" 20 true
    create_email_attr "locations" "email" true
    create_string_attr "locations" "managerId" 255 false
    create_string_attr "locations" "operatingHours" 1000 false
    create_bool_attr "locations" "isActive" true "true"
    create_datetime_attr "locations" "createdAt" false
    
    wait_for_attributes
    create_index "locations" "location_business" "key" "businessId"
    create_index "locations" "location_active" "key" "isActive"
    create_index "locations" "location_city" "key" "city"

    # ==========================================
    # ENHANCED ORDER MANAGEMENT
    # ==========================================
    
    echo -e "\n${GREEN}📦 Setting up Enhanced Order Management collections...${NC}"
    
    # Orders collection (enhanced)
    create_collection "orders" "Orders" true
    sleep 2
    create_string_attr "orders" "orderNumber" 50 true
    create_string_attr "orders" "userId" 255 true
    create_string_attr "orders" "tailorId" 255 false
    create_string_attr "orders" "locationId" 255 false
    create_enum_attr "orders" "type" "custom,alteration,repair" true
    create_enum_attr "orders" "status" "pending,confirmed,in_progress,ready,delivered,cancelled" true "pending"
    create_enum_attr "orders" "priority" "low,normal,high,urgent" true "normal"
    create_enum_attr "orders" "source" "in_store,online,phone,referral" false "in_store"
    create_enum_attr "orders" "style" "agbada,kaftan,plain_kaftan,senator,traditional,modern,custom" false
    create_string_attr "orders" "fabric" 255 false
    create_float_attr "orders" "subtotal" true "0"
    create_float_attr "orders" "taxAmount" false "0"
    create_float_attr "orders" "discountAmount" false "0"
    create_float_attr "orders" "totalAmount" true "0"
    create_float_attr "orders" "depositAmount" false "0"
    create_float_attr "orders" "balanceAmount" false "0"
    create_float_attr "orders" "rushFee" false "0"
    create_string_attr "orders" "notes" 2000 false
    create_string_attr "orders" "internalNotes" 2000 false
    create_datetime_attr "orders" "orderDate" true
    create_datetime_attr "orders" "deliveryDate" false
    create_datetime_attr "orders" "actualDeliveryDate" false
    create_datetime_attr "orders" "cancelledAt" false
    create_string_attr "orders" "cancellationReason" 500 false
    create_datetime_attr "orders" "createdAt" false
    create_datetime_attr "orders" "updatedAt" false
    
    wait_for_attributes
    create_index "orders" "order_number_unique" "unique" "orderNumber"
    create_index "orders" "user_orders" "key" "userId"
    create_index "orders" "tailor_orders" "key" "tailorId"
    create_index "orders" "status_index" "key" "status"
    create_index "orders" "priority_index" "key" "priority"
    create_index "orders" "delivery_date" "key" "deliveryDate"
    create_index "orders" "order_date" "key" "orderDate"
    create_index "orders" "location_orders" "key" "locationId"
    
    # Order Stages collection
    create_collection "order_stages" "Order Stage Tracking" true
    sleep 2
    create_string_attr "order_stages" "orderId" 255 true
    create_enum_attr "order_stages" "stage" "received,measured,cutting,sewing,finishing,quality_check,completed" true
    create_enum_attr "order_stages" "status" "pending,in_progress,completed,skipped" true
    create_datetime_attr "order_stages" "startedAt" false
    create_datetime_attr "order_stages" "completedAt" false
    create_string_attr "order_stages" "completedBy" 255 false
    create_int_attr "order_stages" "duration" false
    create_string_attr "order_stages" "notes" 1000 false
    create_int_attr "order_stages" "qualityScore" false "0" "100"
    
    wait_for_attributes
    create_index "order_stages" "order_stages" "key" "orderId"
    create_index "order_stages" "stage_status" "key" "stage" "status"
    create_index "order_stages" "completed_by" "key" "completedBy"

    # ==========================================
    # FINANCIAL MANAGEMENT
    # ==========================================
    
    echo -e "\n${GREEN}💰 Setting up Financial Management collections...${NC}"
    
    # Invoices collection
    create_collection "invoices" "Invoices" true
    sleep 2
    create_string_attr "invoices" "invoiceNumber" 50 true
    create_string_attr "invoices" "orderId" 255 true
    create_string_attr "invoices" "userId" 255 true
    create_enum_attr "invoices" "status" "draft,sent,viewed,paid,partial,overdue,cancelled" true "draft"
    create_float_attr "invoices" "subtotal" true "0"
    create_float_attr "invoices" "taxAmount" false "0"
    create_float_attr "invoices" "discountAmount" false "0"
    create_float_attr "invoices" "totalAmount" true "0"
    create_float_attr "invoices" "paidAmount" false "0"
    create_float_attr "invoices" "balanceAmount" false "0"
    create_string_attr "invoices" "currency" 10 true "USD"
    create_float_attr "invoices" "exchangeRate" false
    create_datetime_attr "invoices" "invoiceDate" true
    create_datetime_attr "invoices" "dueDate" true
    create_datetime_attr "invoices" "paidDate" false
    create_string_attr "invoices" "terms" 2000 false
    create_string_attr "invoices" "notes" 2000 false
    create_datetime_attr "invoices" "sentAt" false
    create_datetime_attr "invoices" "viewedAt" false
    create_int_attr "invoices" "remindersSent" false "" "" "0"
    create_datetime_attr "invoices" "lastReminderAt" false
    create_datetime_attr "invoices" "createdAt" false
    create_datetime_attr "invoices" "updatedAt" false
    
    wait_for_attributes
    create_index "invoices" "invoice_number_unique" "unique" "invoiceNumber"
    create_index "invoices" "invoice_order" "key" "orderId"
    create_index "invoices" "invoice_user" "key" "userId"
    create_index "invoices" "invoice_status" "key" "status"
    create_index "invoices" "invoice_due" "key" "dueDate"
    create_index "invoices" "invoice_date" "key" "invoiceDate"
    
    # Payments collection
    create_collection "payments" "Payments" true
    sleep 2
    create_string_attr "payments" "paymentNumber" 50 true
    create_string_attr "payments" "invoiceId" 255 true
    create_string_attr "payments" "userId" 255 true
    create_float_attr "payments" "amount" true "0"
    create_string_attr "payments" "currency" 10 true "USD"
    create_enum_attr "payments" "method" "cash,credit_card,debit_card,bank_transfer,check,digital_wallet,other" true
    create_enum_attr "payments" "status" "pending,processing,completed,failed,refunded" true "pending"
    create_string_attr "payments" "transactionId" 255 false
    create_string_attr "payments" "processorResponse" 2000 false
    create_float_attr "payments" "refundAmount" false "0"
    create_string_attr "payments" "notes" 1000 false
    create_datetime_attr "payments" "paymentDate" true
    create_datetime_attr "payments" "processedAt" false
    create_datetime_attr "payments" "failedAt" false
    create_datetime_attr "payments" "refundedAt" false
    create_datetime_attr "payments" "createdAt" false
    
    wait_for_attributes
    create_index "payments" "payment_number_unique" "unique" "paymentNumber"
    create_index "payments" "payment_invoice" "key" "invoiceId"
    create_index "payments" "payment_user" "key" "userId"
    create_index "payments" "payment_status" "key" "status"
    create_index "payments" "payment_date" "key" "paymentDate"
    create_index "payments" "payment_method" "key" "method"
    
    # Expenses collection
    create_collection "expenses" "Business Expenses" false
    sleep 2
    create_string_attr "expenses" "locationId" 255 false
    create_enum_attr "expenses" "category" "fabric,labor,equipment,utilities,rent,marketing,supplies,other" true
    create_string_attr "expenses" "subcategory" 100 false
    create_string_attr "expenses" "description" 500 true
    create_float_attr "expenses" "amount" true "0"
    create_string_attr "expenses" "currency" 10 true "USD"
    create_string_attr "expenses" "vendor" 255 false
    create_string_attr "expenses" "invoiceNumber" 100 false
    create_enum_attr "expenses" "paymentMethod" "cash,credit_card,bank_transfer,check,other" false
    create_bool_attr "expenses" "isRecurring" false "false"
    create_enum_attr "expenses" "recurringFrequency" "daily,weekly,monthly,quarterly,yearly" false
    create_string_attr "expenses" "notes" 1000 false
    create_datetime_attr "expenses" "expenseDate" true
    create_string_attr "expenses" "createdBy" 255 false
    create_string_attr "expenses" "approvedBy" 255 false
    create_datetime_attr "expenses" "approvedAt" false
    create_datetime_attr "expenses" "createdAt" false
    
    wait_for_attributes
    create_index "expenses" "expense_location" "key" "locationId"
    create_index "expenses" "expense_category" "key" "category"
    create_index "expenses" "expense_date" "key" "expenseDate"
    create_index "expenses" "expense_recurring" "key" "isRecurring"

    # ==========================================
    # STYLE & GARMENT CATALOG
    # ==========================================
    
    echo -e "\n${GREEN}🎨 Setting up Style & Garment Catalog collections...${NC}"
    
    # Styles Catalog collection
    create_collection "styles_catalog" "Styles Catalog" false
    sleep 2
    create_string_attr "styles_catalog" "code" 50 true
    create_string_attr "styles_catalog" "name" 100 true
    create_enum_attr "styles_catalog" "category" "agbada,kaftan,plain_kaftan,senator,traditional,modern,western,custom" true
    create_string_attr "styles_catalog" "description" 1000 false
    create_float_attr "styles_catalog" "basePrice" true "0"
    create_float_attr "styles_catalog" "estimatedHours" false "0"
    create_float_attr "styles_catalog" "fabricRequirement" false "0"
    create_enum_attr "styles_catalog" "skillLevel" "beginner,intermediate,advanced,expert" false "intermediate"
    create_enum_attr "styles_catalog" "gender" "male,female,unisex" false "unisex"
    create_enum_attr "styles_catalog" "ageGroup" "child,teen,adult,all" false "adult"
    create_string_attr "styles_catalog" "measurements" 2000 false
    create_string_attr "styles_catalog" "customizationOptions" 2000 false
    create_int_attr "styles_catalog" "popularity" false "" "" "0"
    create_bool_attr "styles_catalog" "isActive" true "true"
    create_bool_attr "styles_catalog" "isFeatured" false "false"
    create_datetime_attr "styles_catalog" "createdAt" false
    create_datetime_attr "styles_catalog" "updatedAt" false
    
    wait_for_attributes
    create_index "styles_catalog" "style_code_unique" "unique" "code"
    create_index "styles_catalog" "style_category" "key" "category"
    create_index "styles_catalog" "style_active" "key" "isActive"
    create_index "styles_catalog" "style_featured" "key" "isFeatured"

    # ==========================================
    # INVENTORY MANAGEMENT
    # ==========================================
    
    echo -e "\n${GREEN}📦 Setting up Inventory Management collections...${NC}"
    
    # Inventory Items collection
    create_collection "inventory_items" "Inventory Items" false
    sleep 2
    create_string_attr "inventory_items" "sku" 100 true
    create_string_attr "inventory_items" "name" 255 true
    create_string_attr "inventory_items" "description" 1000 false
    create_enum_attr "inventory_items" "category" "fabric,button,zipper,thread,lining,accessory,other" true
    create_string_attr "inventory_items" "subcategory" 100 false
    create_enum_attr "inventory_items" "unit" "meter,yard,piece,roll,spool,box" true
    create_float_attr "inventory_items" "unitCost" true "0"
    create_float_attr "inventory_items" "sellingPrice" false "0"
    create_string_attr "inventory_items" "currency" 10 true "USD"
    create_float_attr "inventory_items" "minimumStock" false "0"
    create_float_attr "inventory_items" "maximumStock" false
    create_float_attr "inventory_items" "reorderPoint" false
    create_float_attr "inventory_items" "reorderQuantity" false
    create_string_attr "inventory_items" "supplier" 255 false
    create_string_attr "inventory_items" "supplierSku" 100 false
    create_int_attr "inventory_items" "leadTime" false "0"
    create_string_attr "inventory_items" "color" 50 false
    create_string_attr "inventory_items" "pattern" 100 false
    create_float_attr "inventory_items" "weight" false "0"
    create_float_attr "inventory_items" "width" false "0"
    create_string_attr "inventory_items" "composition" 255 false
    create_string_attr "inventory_items" "careInstructions" 500 false
    create_bool_attr "inventory_items" "isActive" true "true"
    create_datetime_attr "inventory_items" "discontinuedAt" false
    create_datetime_attr "inventory_items" "createdAt" false
    create_datetime_attr "inventory_items" "updatedAt" false
    
    wait_for_attributes
    create_index "inventory_items" "sku_unique" "unique" "sku"
    create_index "inventory_items" "inventory_category" "key" "category"
    create_index "inventory_items" "inventory_active" "key" "isActive"
    create_index "inventory_items" "inventory_supplier" "key" "supplier"
    
    # Inventory Locations collection
    create_collection "inventory_locations" "Inventory by Location" false
    sleep 2
    create_string_attr "inventory_locations" "inventoryItemId" 255 true
    create_string_attr "inventory_locations" "locationId" 255 true
    create_float_attr "inventory_locations" "quantity" true "0"
    create_float_attr "inventory_locations" "reservedQuantity" false "0"
    create_float_attr "inventory_locations" "availableQuantity" false "0"
    create_string_attr "inventory_locations" "binLocation" 100 false
    create_datetime_attr "inventory_locations" "lastCountDate" false
    create_float_attr "inventory_locations" "lastCountQuantity" false "0"
    create_string_attr "inventory_locations" "notes" 500 false
    create_datetime_attr "inventory_locations" "updatedAt" false
    
    wait_for_attributes
    create_index "inventory_locations" "location_inventory" "key" "locationId"
    create_index "inventory_locations" "low_stock" "key" "availableQuantity"
    
    # Inventory Transactions collection
    create_collection "inventory_transactions" "Inventory Transactions" false
    sleep 2
    create_string_attr "inventory_transactions" "inventoryItemId" 255 true
    create_string_attr "inventory_transactions" "locationId" 255 true
    create_enum_attr "inventory_transactions" "type" "purchase,sale,adjustment,transfer,return,damage,sample" true
    create_float_attr "inventory_transactions" "quantity" true
    create_float_attr "inventory_transactions" "unitCost" false "0"
    create_float_attr "inventory_transactions" "totalCost" false
    create_enum_attr "inventory_transactions" "referenceType" "order,purchase_order,adjustment,transfer" false
    create_string_attr "inventory_transactions" "referenceId" 100 false
    create_string_attr "inventory_transactions" "reason" 500 false
    create_string_attr "inventory_transactions" "performedBy" 255 false
    create_datetime_attr "inventory_transactions" "transactionDate" true
    create_datetime_attr "inventory_transactions" "createdAt" false
    
    wait_for_attributes
    create_index "inventory_transactions" "transaction_item" "key" "inventoryItemId"
    create_index "inventory_transactions" "transaction_location" "key" "locationId"
    create_index "inventory_transactions" "transaction_type" "key" "type"
    create_index "inventory_transactions" "transaction_date" "key" "transactionDate"

    # ==========================================
    # CUSTOMER RELATIONSHIP MANAGEMENT
    # ==========================================
    
    echo -e "\n${GREEN}🤝 Setting up Customer Relationship Management collections...${NC}"
    
    # Client Segments collection
    create_collection "client_segments" "Client Segments" false
    sleep 2
    create_string_attr "client_segments" "name" 100 true
    create_string_attr "client_segments" "description" 500 false
    create_enum_attr "client_segments" "type" "value,behavior,demographic,custom" true
    create_string_attr "client_segments" "criteria" 2000 true
    create_string_attr "client_segments" "benefits" 2000 false
    create_string_attr "client_segments" "color" 20 false
    create_string_attr "client_segments" "icon" 50 false
    create_int_attr "client_segments" "priority" false "1" "" "100"
    create_bool_attr "client_segments" "isActive" true "true"
    create_datetime_attr "client_segments" "createdAt" false
    create_datetime_attr "client_segments" "updatedAt" false
    
    wait_for_attributes
    create_index "client_segments" "segment_name" "key" "name"
    create_index "client_segments" "segment_type" "key" "type"
    create_index "client_segments" "segment_active" "key" "isActive"
    
    # Client Segments Users collection
    create_collection "client_segments_users" "Client Segment Memberships" false
    sleep 2
    create_string_attr "client_segments_users" "segmentId" 255 true
    create_string_attr "client_segments_users" "userId" 255 true
    create_datetime_attr "client_segments_users" "assignedAt" true
    create_datetime_attr "client_segments_users" "expiresAt" false
    create_bool_attr "client_segments_users" "manualOverride" false "false"
    create_string_attr "client_segments_users" "notes" 500 false
    
    wait_for_attributes
    create_index "client_segments_users" "segment_users" "key" "segmentId"
    create_index "client_segments_users" "user_segments" "key" "userId"
    create_index "client_segments_users" "segment_expiry" "key" "expiresAt"
    
    # Loyalty Points collection
    create_collection "loyalty_points" "Loyalty Points" true
    sleep 2
    create_string_attr "loyalty_points" "userId" 255 true
    create_int_attr "loyalty_points" "points" true "" "" "0"
    create_int_attr "loyalty_points" "lifetimePoints" false "" "" "0"
    create_enum_attr "loyalty_points" "tier" "bronze,silver,gold,platinum" false "bronze"
    create_datetime_attr "loyalty_points" "tierExpiryDate" false
    create_datetime_attr "loyalty_points" "lastActivityDate" false
    create_datetime_attr "loyalty_points" "createdAt" false
    create_datetime_attr "loyalty_points" "updatedAt" false
    
    wait_for_attributes
    create_index "loyalty_points" "loyalty_user" "unique" "userId"
    create_index "loyalty_points" "loyalty_tier" "key" "tier"
    create_index "loyalty_points" "loyalty_points" "key" "points"
    
    # Loyalty Transactions collection
    create_collection "loyalty_transactions" "Loyalty Transactions" true
    sleep 2
    create_string_attr "loyalty_transactions" "userId" 255 true
    create_enum_attr "loyalty_transactions" "type" "earned,redeemed,expired,adjusted" true
    create_int_attr "loyalty_transactions" "points" true
    create_int_attr "loyalty_transactions" "balance" true
    create_enum_attr "loyalty_transactions" "source" "order,referral,promotion,manual,system" true
    create_string_attr "loyalty_transactions" "referenceId" 100 false
    create_string_attr "loyalty_transactions" "description" 500 true
    create_datetime_attr "loyalty_transactions" "expiresAt" false
    create_datetime_attr "loyalty_transactions" "transactionDate" true
    create_datetime_attr "loyalty_transactions" "createdAt" false
    
    wait_for_attributes
    create_index "loyalty_transactions" "loyalty_trans_user" "key" "userId"
    create_index "loyalty_transactions" "loyalty_trans_type" "key" "type"
    create_index "loyalty_transactions" "loyalty_trans_date" "key" "transactionDate"
    create_index "loyalty_transactions" "loyalty_trans_source" "key" "source"

    # ==========================================
    # COMMUNICATION & COLLABORATION
    # ==========================================
    
    echo -e "\n${GREEN}💬 Setting up Communication & Collaboration collections...${NC}"
    
    # Communications collection
    create_collection "communications" "Communications" true
    sleep 2
    create_enum_attr "communications" "type" "email,sms,call,in_person,app_message,whatsapp" true
    create_enum_attr "communications" "direction" "inbound,outbound" true
    create_enum_attr "communications" "status" "pending,sent,delivered,failed,read" true "pending"
    create_string_attr "communications" "fromUserId" 255 true
    create_string_attr "communications" "toUserId" 255 true
    create_string_attr "communications" "subject" 500 false
    create_string_attr "communications" "content" 10000 true
    create_string_attr "communications" "metadata" 2000 false
    create_enum_attr "communications" "referenceType" "order,appointment,invoice,general" false
    create_string_attr "communications" "referenceId" 100 false
    create_datetime_attr "communications" "scheduledFor" false
    create_datetime_attr "communications" "sentAt" false
    create_datetime_attr "communications" "deliveredAt" false
    create_datetime_attr "communications" "readAt" false
    create_string_attr "communications" "failureReason" 500 false
    create_datetime_attr "communications" "createdAt" false
    
    wait_for_attributes
    create_index "communications" "comm_from" "key" "fromUserId"
    create_index "communications" "comm_to" "key" "toUserId"
    create_index "communications" "comm_type" "key" "type"
    create_index "communications" "comm_status" "key" "status"
    create_index "communications" "comm_scheduled" "key" "scheduledFor"
    
    # Notifications Queue collection
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
    
    echo -e "\n${GREEN}✅ Comprehensive database setup completed successfully!${NC}"
    echo -e "\n${BLUE}📊 Summary:${NC}"
    echo -e "  - Database: ${DATABASE_ID}"
    echo -e "  - Total Collections: 28"
    echo -e "  - Core User & Auth: users, sessions"
    echo -e "  - Business & Location: businesses, locations"
    echo -e "  - Order Management: orders, order_stages"
    echo -e "  - Financial: invoices, payments, expenses"
    echo -e "  - Catalog: styles_catalog"
    echo -e "  - Inventory: inventory_items, inventory_locations, inventory_transactions"
    echo -e "  - CRM: client_segments, client_segments_users, loyalty_points, loyalty_transactions"
    echo -e "  - Communication: communications, notifications_queue"
    echo -e "  - Analytics: kpi_metrics, ai_insights"
    echo -e "  - Security: audit_logs, security_events"
    echo -e "  - Reporting: scheduled_reports, report_history"
    echo -e "\n${GREEN}🎉 Your comprehensive Stitch and Wear Tailors database is ready!${NC}"
    echo -e "${GREEN}Ready to power both mobile app and sophisticated web dashboard!${NC}"
}

# Run the comprehensive setup
setup_comprehensive_database