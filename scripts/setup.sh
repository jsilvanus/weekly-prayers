#!/bin/bash

# Weekly Prayers - Development Setup Script

set -e

echo "=== Weekly Prayers Development Setup ==="

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "Please edit .env with your configuration"
fi

# Start database
echo "Starting PostgreSQL..."
docker-compose -f docker-compose.dev.yml up -d db

# Wait for database to be ready
echo "Waiting for database to be ready..."
sleep 5

# Run migrations
echo "Running migrations..."
docker-compose -f docker-compose.dev.yml --profile migrate up migrate

# Start backend
echo "Starting backend with hot reload..."
docker-compose -f docker-compose.dev.yml up -d backend

echo ""
echo "=== Setup Complete ==="
echo "Backend API: http://localhost:3000"
echo "Health check: http://localhost:3000/api/health"
echo ""
echo "To view logs: docker-compose -f docker-compose.dev.yml logs -f"
echo "To stop: docker-compose -f docker-compose.dev.yml down"
