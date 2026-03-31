#!/bin/bash

# InsightBoard - All-in-one Startup Script
# This official utility script launches both the Backend and Frontend servers concurrently.

# Color definitions for better logging
BLUE='\033[0;34m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo -e "${BLUE}>>> Starting InsightBoard Platform...${NC}"

# 1. Start Backend (FastAPI)
echo -e "${GREEN}>>> Launching Backend API (Python/FastAPI)...${NC}"
cd backend
./venv/bin/python3 -m uvicorn main:app --port 8000 &
BACKEND_PID=$!
cd ..

# 2. Start Frontend (Vite/React)
echo -e "${GREEN}>>> Launching Frontend UI (Vite/React)...${NC}"
cd frontend
npm run dev -- --port 3000 --host 0.0.0.0 &
FRONTEND_PID=$!
cd ..

echo -e "${BLUE}>>> Services started successfully!${NC}"
echo -e "${BLUE}>>> Backend: http://localhost:8000${NC}"
echo -e "${BLUE}>>> Frontend: http://localhost:3000${NC}"
echo -e "${BLUE}>>> Press Ctrl+C to stop all services.${NC}"

# Function to clean up processes on exit
cleanup() {
    echo -e "\n${BLUE}>>> Shutting down services...${NC}"
    kill $BACKEND_PID
    kill $FRONTEND_PID
    exit
}

# Trap termination signals
trap cleanup SIGINT SIGTERM

# Wait for background processes
wait
