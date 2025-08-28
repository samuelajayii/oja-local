#!/bin/bash

# Exit on any error
set -e

# Check if running in Cloud Run (has CLOUD_SQL_CONNECTION_NAME)
if [ -n "$CLOUD_SQL_CONNECTION_NAME" ]; then
    echo "Starting Cloud SQL Proxy for connection: $CLOUD_SQL_CONNECTION_NAME"
    
    # Start Cloud SQL Proxy v2 in the background
    cloud-sql-proxy --port 5432 oja-local-46990:europe-west1:marketplace-db &
    
    # Store the proxy PID
    PROXY_PID=$!
    echo "Cloud SQL Proxy started with PID: $PROXY_PID"
    
    # Wait a moment for the proxy to initialize
    sleep 5
    
    # Function to cleanup proxy on exit
    cleanup() {
        echo "Shutting down Cloud SQL Proxy..."
        kill $PROXY_PID 2>/dev/null || true
        wait $PROXY_PID 2>/dev/null || true
        echo "Cloud SQL Proxy stopped."
    }
    
    # Set trap to cleanup on exit
    trap cleanup EXIT INT TERM
    
    # Test database connection
    echo "Testing database connection..."
    npx prisma db pull --schema=./prisma/schema.prisma 2>/dev/null || echo "Database connection test completed"
else
    echo "No CLOUD_SQL_CONNECTION_NAME found, assuming local development"
fi

# Start the Next.js application
echo "Starting Next.js application on port $PORT"
exec npm start