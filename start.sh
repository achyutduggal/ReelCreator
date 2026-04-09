#!/bin/bash
set -e

echo "=== ReelCreator Setup ==="

# Create storage directories
mkdir -p backend/storage/{uploads,metadata,renders}

# Check for .env
if [ ! -f backend/.env ]; then
  echo "Creating backend/.env from .env.example..."
  cp backend/.env.example backend/.env
  echo "!! Please set your GEMINI_API_KEY in backend/.env"
fi

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
pip install -r requirements.txt
cd ..

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo ""
echo "=== Setup Complete ==="
echo ""
echo "To start the backend:"
echo "  cd backend && uvicorn main:app --reload --port 8000"
echo ""
echo "To start the frontend:"
echo "  cd frontend && npm run dev"
echo ""
echo "Backend API docs: http://localhost:8000/docs"
echo "Frontend:         http://localhost:3000"
