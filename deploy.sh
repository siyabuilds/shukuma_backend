#!/bin/env bash

# Navigate to the backend directory
cd ~/shukuma_backend || exit

# Pull the latest changes
git pull origin main

# Build the latest Docker image
docker build -t shukuma_backend:latest .

# Stop & remove old container if exists
docker stop shukuma_backend 2>/dev/null || true
docker rm shukuma_backend 2>/dev/null || true

# Run the new container
docker run -d -p 3000:3000 \
  --name shukuma_backend \
  --restart unless-stopped \
  --env-file .env \
  shukuma_backend:latest

echo "Deployed latest backend!"
