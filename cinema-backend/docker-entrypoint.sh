#!/bin/bash
set -e

echo "Starting backend (migrations run automatically at application startup)..."

# Start the app with watch in development for faster feedback
exec dotnet watch run --urls "http://0.0.0.0:5000"
