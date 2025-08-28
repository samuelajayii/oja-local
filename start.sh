#!/bin/sh

# Start Cloud SQL Proxy in the background
/cloud_sql_proxy oja-local-46990:europe-west1:marketplace-db --credentials-file="/app/marketplace-dev-key.json" --port=5432 &

# Wait for proxy to be ready
sleep 5

# Start the Next.js application
npm start