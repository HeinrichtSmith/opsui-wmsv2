#!/bin/bash

# Load test picker data into database
# This adds 4 test pickers and 5 test orders with different states

cd "$(dirname "$0")"

echo "📦 Loading test picker data..."

# Run the node script to load test data
node run-test-pickers.js

if [ $? -eq 0 ]; then
    echo "✅ Test picker data loaded successfully!"
    echo ""
    echo "📊 Test data includes:"
    echo "  - 4 picker users (John, Jane, Mike, Sarah)"
    echo "  - 5 test orders with different picker states:"
    echo "    * ORD-TEST01: Being picked by John (ACTIVE)"
    echo "    * ORD-TEST02: Pending (no picker)"
    echo "    * ORD-TEST03: Recently picked by Jane (IDLE)"
    echo "    * ORD-TEST04: Being picked by Mike (ACTIVE)"
    echo "    * ORD-TEST05: Picked by Sarah 2h ago (IDLE)"
else
    echo "❌ Failed to load test picker data"
    exit 1
fi

echo ""
echo "🌐 Test the picker activity endpoint:"
echo "curl http://localhost:3001/api/metrics/picker-activity"