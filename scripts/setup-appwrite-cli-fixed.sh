#!/bin/bash

# Appwrite Database Setup Script using CLI (Fixed Version)
# This script sets up the essential database schema for Stitch and Wear Tailors

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

# Simplified attribute creation functions
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
    local default_value=$4
    
    echo -e "  🔢 Creating integer attribute: ${key}"
    if [ -n "$default_value" ] && [ "$required" = "false" ]; then
        appwrite databases create-integer-attribute \
            --database-id "$DATABASE_ID" \
            --collection-id "$collection_id" \
            --key "$key" \
            --required "$required" \
            --xdefault "$default_value" \
            || echo -e "    ${YELLOW}Attribute ${key} might already exist${NC}"
    else
        appwrite databases create-integer-attribute \
            --database-id "$DATABASE_ID" \
            --collection-id "$collection_id" \
            --key "$key" \
            --required "$required" \
            || echo -e "    ${YELLOW}Attribute ${key} might already exist${NC}"
    fi
}

create_index() {
    local collection_id=$1
    local key=$2
    local type=$3
    shift 3
    local attributes=("$@")
    
    echo -e "  🗂️  Creating index: ${key}"
    appwrite databases create-index \
        --database-id "$DATABASE_ID" \
        --collection-id "$collection_id" \
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
    sleep 2
    
    # Create Users collection
    echo -e "\n${GREEN}👥 Setting up Users collection...${NC}"
    create_collection "users" "Users" true
    sleep 2
    
    # Users attributes
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
    create_int_attr "users" "loginCount" false "0"
    create_datetime_attr "users" "createdAt" false
    create_datetime_attr "users" "updatedAt" false
    
    echo -e "\n${YELLOW}⏳ Waiting for attributes to be ready...${NC}"
    sleep 8
    create_index "users" "email_unique" "unique" "email"
    create_index "users" "role_index" "key" "role"
    create_index "users" "status_index" "key" "status"
    
    # Create Orders collection
    echo -e "\n${GREEN}📦 Setting up Orders collection...${NC}"
    create_collection "orders" "Orders" true
    sleep 2
    
    # Orders attributes
    create_string_attr "orders" "orderNumber" 50 true
    create_string_attr "orders" "userId" 255 true
    create_string_attr "orders" "tailorId" 255 false
    create_enum_attr "orders" "type" "custom,alteration,repair" true
    create_enum_attr "orders" "status" "pending,confirmed,in_progress,ready,delivered,cancelled" false "pending"
    create_enum_attr "orders" "style" "agbada,kaftan,plain_kaftan,senator,traditional,modern,custom" false
    create_string_attr "orders" "fabric" 255 false
    create_float_attr "orders" "totalAmount" true "0"
    create_string_attr "orders" "notes" 2000 false
    create_datetime_attr "orders" "orderDate" true
    create_datetime_attr "orders" "deliveryDate" false
    create_datetime_attr "orders" "createdAt" false
    create_datetime_attr "orders" "updatedAt" false
    
    echo -e "\n${YELLOW}⏳ Waiting for attributes to be ready...${NC}"
    sleep 8
    create_index "orders" "order_number_unique" "unique" "orderNumber"
    create_index "orders" "user_orders" "key" "userId"
    create_index "orders" "tailor_orders" "key" "tailorId"
    create_index "orders" "status_index" "key" "status"
    
    # Create Businesses collection
    echo -e "\n${GREEN}🏢 Setting up Businesses collection...${NC}"
    create_collection "businesses" "Businesses" false
    sleep 2
    
    # Business attributes
    create_string_attr "businesses" "name" 255 true
    create_enum_attr "businesses" "type" "single,franchise,chain" false "single"
    create_string_attr "businesses" "currency" 10 false "USD"
    create_string_attr "businesses" "timezone" 50 false "UTC"
    create_datetime_attr "businesses" "createdAt" false
    create_datetime_attr "businesses" "updatedAt" false
    
    echo -e "\n${YELLOW}⏳ Waiting for attributes to be ready...${NC}"
    sleep 5
    create_index "businesses" "business_name" "key" "name"
    create_index "businesses" "business_type" "key" "type"
    
    echo -e "\n${GREEN}✅ Essential database setup completed successfully!${NC}"
    echo -e "\n${BLUE}📊 Summary:${NC}"
    echo -e "  - Database: ${DATABASE_ID}"
    echo -e "  - Collections: users, orders, businesses"
    echo -e "  - All attributes and indexes created"
    echo -e "\n${GREEN}🎉 Your Stitch and Wear Tailors database is ready!${NC}"
}

# Run the setup
setup_database