#!/bin/bash

# Verify Appwrite Database Setup

# Load environment variables
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '#' | awk '/=/ {print $1}')
fi

ENDPOINT=${APPWRITE_ENDPOINT}
PROJECT_ID=${APPWRITE_PROJECT_ID}
API_KEY=${APPWRITE_API_KEY}
DATABASE_ID="stitch-and-wear-db"

echo "🔍 Verifying Appwrite Database Setup..."
echo "📡 Endpoint: $ENDPOINT"
echo "🆔 Project: $PROJECT_ID"
echo "🗄️ Database: $DATABASE_ID"

# Configure CLI
appwrite client --endpoint "$ENDPOINT" --project-id "$PROJECT_ID" --key "$API_KEY" > /dev/null 2>&1

echo -e "\n📊 Database Info:"
appwrite databases get --database-id "$DATABASE_ID"

echo -e "\n📂 Collections:"
appwrite databases list-collections --database-id "$DATABASE_ID"

echo -e "\n👥 Users Collection Attributes:"
appwrite databases list-attributes --database-id "$DATABASE_ID" --collection-id "users"

echo -e "\n📦 Orders Collection Attributes:"
appwrite databases list-attributes --database-id "$DATABASE_ID" --collection-id "orders"

echo -e "\n🏢 Businesses Collection Attributes:"
appwrite databases list-attributes --database-id "$DATABASE_ID" --collection-id "businesses"

echo -e "\n✅ Database verification complete!"