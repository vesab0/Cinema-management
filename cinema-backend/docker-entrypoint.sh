#!/bin/bash
set -e

echo "Restoring local .NET tools..."
dotnet tool restore

# Wait and run EF migrations until DB is ready
echo "Running migrations (will retry until successful)..."
until dotnet tool run dotnet-ef database update --context TwinPeaks.API.Data.ApplicationDbContext
do
  echo "Migration failed or database not ready, retrying in 3s..."
  sleep 3
done

echo "Migrations applied. Starting app..."

# Start the app with watch in development for faster feedback
exec dotnet watch run --urls "http://0.0.0.0:5000"
