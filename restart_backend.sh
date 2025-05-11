#!/bin/bash
echo "Restarting backend server with Swagger documentation..."
cd "$(dirname "$0")/backend"
npm run dev 