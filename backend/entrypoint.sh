#!/bin/sh
set -e

MONGO_HOST="mongo"
MONGO_PORT="27017"

echo ""
echo "========================================="
echo "   Institute ERP — Backend Starting"
echo "========================================="

# Wait for MongoDB using a pure Node.js TCP check (no extra tools needed)
echo "⏳ Waiting for MongoDB at $MONGO_HOST:$MONGO_PORT ..."
until node -e "
  const net = require('net');
  const s = new net.Socket();
  s.setTimeout(2000);
  s.on('connect', () => { s.destroy(); process.exit(0); });
  s.on('error',   () => { s.destroy(); process.exit(1); });
  s.on('timeout', () => { s.destroy(); process.exit(1); });
  s.connect($MONGO_PORT, '$MONGO_HOST');
" 2>/dev/null; do
  echo "   MongoDB not ready yet — retrying in 2s..."
  sleep 2
done

echo "✅ MongoDB is ready!"
echo ""

# Run seed (creates admin only if no admin exists yet)
echo "🌱 Running database seed..."
node src/seed.js

echo ""
echo "🚀 Starting server..."
echo "========================================="
exec node src/server.js
