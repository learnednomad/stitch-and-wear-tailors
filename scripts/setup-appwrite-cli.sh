#!/bin/bash

# Appwrite Database Setup Script using CLI
# This script sets up the complete database schema for Stitch and Wear Tailors

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

echo -e "${BLUE}🚀 Appwrite Database Setup${NC}"
echo -e "${BLUE}📡 Endpoint: ${ENDPOINT}${NC}"
echo -e "${BLUE}🆔 Project: ${PROJECT_ID}${NC}"
echo -e "${BLUE}🗄️  Database: ${DATABASE_ID}${NC}"

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
    echo -e "\n${YELLOW}🗄️  Creating database...${NC}"
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
    
    echo -e "\n${YELLOW}📁 Creating collection: ${collection_id}${NC}"
    appwrite databases create-collection \
        --database-id "$DATABASE_ID" \
        --collection-id "$collection_id" \
        --name "$collection_name" \
        --document-security "$document_security" \
        --enabled true \
        --permissions 'read("users")' 'create("users")' \
        || echo -e "${YELLOW}Collection ${collection_id} might already exist${NC}"
}

# Function to create string attribute
create_string_attribute() {
    local collection_id=$1
    local key=$2
    local size=$3
    local required=${4:-false}
    local default_value=$5
    
    echo -e "  📝 Creating string attribute: ${key}"
    if [ -n "$default_value" ]; then
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

# Function to create email attribute
create_email_attribute() {
    local collection_id=$1
    local key=$2
    local required=${3:-false}
    
    echo -e "  📧 Creating email attribute: ${key}"
    appwrite databases createEmailAttribute \
        --databaseId "$DATABASE_ID" \
        --collectionId "$collection_id" \
        --key "$key" \
        --required "$required" \
        || echo -e "    ${YELLOW}Attribute ${key} might already exist${NC}"
}

# Function to create enum attribute
create_enum_attribute() {
    local collection_id=$1
    local key=$2
    local elements=$3
    local required=${4:-false}
    local default_value=$5
    
    echo -e "  🔢 Creating enum attribute: ${key}"
    if [ -n "$default_value" ]; then
        appwrite databases createEnumAttribute \
            --databaseId "$DATABASE_ID" \
            --collectionId "$collection_id" \
            --key "$key" \
            --elements "$elements" \
            --required "$required" \
            --default "$default_value" \
            || echo -e "    ${YELLOW}Attribute ${key} might already exist${NC}"
    else
        appwrite databases createEnumAttribute \
            --databaseId "$DATABASE_ID" \
            --collectionId "$collection_id" \
            --key "$key" \
            --elements "$elements" \
            --required "$required" \
            || echo -e "    ${YELLOW}Attribute ${key} might already exist${NC}"
    fi
}

# Function to create boolean attribute
create_boolean_attribute() {
    local collection_id=$1
    local key=$2
    local required=${3:-false}
    local default_value=$4
    
    echo -e "  ✅ Creating boolean attribute: ${key}"
    if [ -n "$default_value" ]; then
        appwrite databases createBooleanAttribute \
            --databaseId "$DATABASE_ID" \
            --collectionId "$collection_id" \
            --key "$key" \
            --required "$required" \
            --default "$default_value" \
            || echo -e "    ${YELLOW}Attribute ${key} might already exist${NC}"
    else
        appwrite databases createBooleanAttribute \
            --databaseId "$DATABASE_ID" \
            --collectionId "$collection_id" \
            --key "$key" \
            --required "$required" \
            || echo -e "    ${YELLOW}Attribute ${key} might already exist${NC}"
    fi
}

# Function to create float attribute
create_float_attribute() {
    local collection_id=$1
    local key=$2
    local required=${3:-false}
    local min=$4
    local max=$5
    local default_value=$6
    
    echo -e "  🔢 Creating float attribute: ${key}"
    cmd="appwrite databases createFloatAttribute --databaseId '$DATABASE_ID' --collectionId '$collection_id' --key '$key' --required '$required'"
    
    if [ -n "$min" ]; then
        cmd="$cmd --min $min"
    fi
    if [ -n "$max" ]; then
        cmd="$cmd --max $max"
    fi
    if [ -n "$default_value" ]; then
        cmd="$cmd --default $default_value"
    fi
    
    eval "$cmd" || echo -e "    ${YELLOW}Attribute ${key} might already exist${NC}"
}

# Function to create datetime attribute
create_datetime_attribute() {
    local collection_id=$1
    local key=$2
    local required=${3:-false}
    
    echo -e "  📅 Creating datetime attribute: ${key}"
    appwrite databases createDatetimeAttribute \
        --databaseId "$DATABASE_ID" \
        --collectionId "$collection_id" \
        --key "$key" \
        --required "$required" \
        || echo -e "    ${YELLOW}Attribute ${key} might already exist${NC}"
}

# Function to create integer attribute
create_integer_attribute() {
    local collection_id=$1
    local key=$2
    local required=${3:-false}
    local min=$4
    local max=$5
    local default_value=$6
    
    echo -e "  🔢 Creating integer attribute: ${key}"
    cmd="appwrite databases createIntegerAttribute --databaseId '$DATABASE_ID' --collectionId '$collection_id' --key '$key' --required '$required'"
    
    if [ -n "$min" ]; then
        cmd="$cmd --min $min"
    fi
    if [ -n "$max" ]; then
        cmd="$cmd --max $max"
    fi
    if [ -n "$default_value" ]; then
        cmd="$cmd --default $default_value"
    fi
    
    eval "$cmd" || echo -e "    ${YELLOW}Attribute ${key} might already exist${NC}"
}

# Function to create index
create_index() {
    local collection_id=$1
    local key=$2
    local type=$3
    shift 3
    local attributes=("$@")
    
    echo -e "  🗂️  Creating index: ${key}"
    appwrite databases createIndex \
        --databaseId "$DATABASE_ID" \
        --collectionId "$collection_id" \
        --key "$key" \
        --type "$type" \
        --attributes "${attributes[@]}" \
        || echo -e "    ${YELLOW}Index ${key} might already exist${NC}"
}

# Main setup function
setup_database() {
    echo -e "\n${GREEN}🏗️  Starting database setup...${NC}"
    
    # Create database
    create_database
    
    # Wait for database to be ready
    echo -e "\n${YELLOW}⏳ Waiting for database to be ready...${NC}"
    sleep 2
    
    # Create Users collection
    echo -e "\n${GREEN}👥 Setting up Users collection...${NC}"
    create_collection "users" "Users" true
    sleep 1
    create_email_attribute "users" "email" true
    create_enum_attribute "users" "role" "client,tailor,admin" true
    create_enum_attribute "users" "status" "active,inactive,suspended" false "active"
    create_string_attribute "users" "profile" 5000 false
    create_string_attribute "users" "phoneNumber" 20 false
    create_string_attribute "users" "businessId" 255 false
    create_string_attribute "users" "preferredLanguage" 10 false "en"
    create_enum_attribute "users" "preferredCommunication" "email,sms,phone,app" false "email"
    create_boolean_attribute "users" "twoFactorEnabled" false "false"
    create_datetime_attribute "users" "lastLoginAt" false
    create_integer_attribute "users" "loginCount" false "" "" "0"
    create_datetime_attribute "users" "createdAt" false
    create_datetime_attribute "users" "updatedAt" false
    
    # Wait and create indexes
    echo -e "\n${YELLOW}⏳ Waiting for attributes to be ready...${NC}"
    sleep 5
    create_index "users" "email_unique" "unique" "email"
    create_index "users" "role_index" "key" "role"
    create_index "users" "status_index" "key" "status"
    
    # Create Orders collection
    echo -e "\n${GREEN}📦 Setting up Orders collection...${NC}"
    create_collection "orders" "Orders" true
    sleep 1
    create_string_attribute "orders" "orderNumber" 50 true
    create_string_attribute "orders" "userId" 255 true
    create_string_attribute "orders" "tailorId" 255 false
    create_enum_attribute "orders" "type" "custom,alteration,repair" true
    create_enum_attribute "orders" "status" "pending,confirmed,in_progress,ready,delivered,cancelled" false "pending"
    create_enum_attribute "orders" "style" "agbada,kaftan,plain_kaftan,senator,traditional,modern,custom" false
    create_string_attribute "orders" "fabric" 255 false
    create_float_attribute "orders" "totalAmount" true "0"
    create_string_attribute "orders" "notes" 2000 false
    create_datetime_attribute "orders" "orderDate" true
    create_datetime_attribute "orders" "deliveryDate" false
    create_datetime_attribute "orders" "createdAt" false
    create_datetime_attribute "orders" "updatedAt" false
    
    # Wait and create indexes
    echo -e "\n${YELLOW}⏳ Waiting for attributes to be ready...${NC}"
    sleep 5
    create_index "orders" "order_number_unique" "unique" "orderNumber"
    create_index "orders" "user_orders" "key" "userId"
    create_index "orders" "tailor_orders" "key" "tailorId"
    create_index "orders" "status_index" "key" "status"
    
    # Create Businesses collection
    echo -e "\n${GREEN}🏢 Setting up Businesses collection...${NC}"
    create_collection "businesses" "Businesses" false
    sleep 1
    create_string_attribute "businesses" "name" 255 true
    create_enum_attribute "businesses" "type" "single,franchise,chain" false "single"
    create_string_attribute "businesses" "currency" 10 false "USD"
    create_string_attribute "businesses" "timezone" 50 false "UTC"
    create_datetime_attribute "businesses" "createdAt" false
    create_datetime_attribute "businesses" "updatedAt" false
    
    # Wait and create indexes
    echo -e "\n${YELLOW}⏳ Waiting for attributes to be ready...${NC}"
    sleep 5
    create_index "businesses" "business_name" "key" "name"
    create_index "businesses" "business_type" "key" "type"
    
    # Create Styles Catalog collection
    echo -e "\n${GREEN}🎨 Setting up Styles Catalog collection...${NC}"
    create_collection "styles_catalog" "Styles Catalog" false
    sleep 1
    create_string_attribute "styles_catalog" "code" 50 true
    create_string_attribute "styles_catalog" "name" 100 true
    create_enum_attribute "styles_catalog" "category" "agbada,kaftan,plain_kaftan,senator,traditional,modern,western,custom" true
    create_string_attribute "styles_catalog" "description" 1000 false
    create_float_attribute "styles_catalog" "basePrice" true "0"
    create_boolean_attribute "styles_catalog" "isActive" false "true"
    create_datetime_attribute "styles_catalog" "createdAt" false
    
    # Wait and create indexes
    echo -e "\n${YELLOW}⏳ Waiting for attributes to be ready...${NC}"
    sleep 5
    create_index "styles_catalog" "style_code_unique" "unique" "code"
    create_index "styles_catalog" "style_category" "key" "category"
    create_index "styles_catalog" "style_active" "key" "isActive"
    
    # Create Notifications Queue collection
    echo -e "\n${GREEN}🔔 Setting up Notifications Queue collection...${NC}"
    create_collection "notifications_queue" "Notification Queue" true
    sleep 1
    create_string_attribute "notifications_queue" "userId" 255 true
    create_enum_attribute "notifications_queue" "type" "order_update,appointment_reminder,payment_due,promotion,system,message" true
    create_string_attribute "notifications_queue" "title" 255 true
    create_string_attribute "notifications_queue" "message" 2000 true
    create_enum_attribute "notifications_queue" "status" "pending,sent,delivered,failed,cancelled" false "pending"
    create_datetime_attribute "notifications_queue" "createdAt" false
    
    # Wait and create indexes
    echo -e "\n${YELLOW}⏳ Waiting for attributes to be ready...${NC}"
    sleep 5
    create_index "notifications_queue" "notif_user" "key" "userId"
    create_index "notifications_queue" "notif_status" "key" "status"
    create_index "notifications_queue" "notif_type" "key" "type"
    
    echo -e "\n${GREEN}✅ Database setup completed successfully!${NC}"
    echo -e "\n${BLUE}📊 Summary:${NC}"
    echo -e "  - Database: ${DATABASE_ID}"
    echo -e "  - Collections: users, orders, businesses, styles_catalog, notifications_queue"
    echo -e "  - All attributes and indexes created"
    echo -e "\n${GREEN}🎉 Your Stitch and Wear Tailors database is ready!${NC}"
}

# Run the setup
setup_database