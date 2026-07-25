#!/bin/bash

# MDB Development/Production Start Script
# Usage: ./start.sh [dev|prod|backend|frontend]

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_dependencies() {
    log_info "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        log_warn "Node.js version is $NODE_VERSION.x, recommended 18+"
    fi
    
    log_success "Dependencies OK"
}

install_all() {
    log_info "Installing root dependencies..."
    cd "$PROJECT_ROOT"
    npm install
    
    log_info "Installing frontend dependencies..."
    cd "$FRONTEND_DIR"
    npm install
    
    log_info "Installing backend dependencies..."
    cd "$BACKEND_DIR"
    npm install
    
    log_success "All dependencies installed"
}

start_dev() {
    log_info "Starting development servers..."
    
    # Check if .env exists
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        log_warn ".env not found, copying from .env.example"
        cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
    fi
    
    cd "$PROJECT_ROOT"
    
    # Start backend with watch mode
    log_info "Starting backend on port 8081..."
    node --watch backend/src/index.js &
    BACKEND_PID=$!
    
    # Wait for backend to start
    sleep 3
    
    # Start frontend
    log_info "Starting frontend on port 5173..."
    cd "$FRONTEND_DIR"
    npm run dev &
    FRONTEND_PID=$!
    
    log_success "Development servers started!"
    log_info "Backend: http://localhost:8081"
    log_info "Frontend: http://localhost:5173"
    log_info "Press Ctrl+C to stop both servers"
    
    # Wait for interrupt
    trap "kill $BACKEND_PID $FRONTEND_PID; exit 0" INT TERM
    wait
}

start_prod() {
    log_info "Starting production server..."
    
    # Build frontend
    log_info "Building frontend..."
    cd "$FRONTEND_DIR"
    npm run build
    
    # Check .env
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        log_error ".env file required for production"
        exit 1
    fi
    
    # Start backend
    log_info "Starting production server on port 8081..."
    cd "$PROJECT_ROOT"
    NODE_ENV=production node backend/src/index.js
}

start_backend_only() {
    log_info "Starting backend only..."
    
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        log_warn ".env not found, copying from .env.example"
        cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
    fi
    
    cd "$PROJECT_ROOT"
    if [ "$1" = "dev" ]; then
        node --watch backend/src/index.js
    else
        node backend/src/index.js
    fi
}

start_frontend_only() {
    log_info "Starting frontend only..."
    cd "$FRONTEND_DIR"
    npm run dev
}

show_help() {
    echo "MDB Start Script"
    echo ""
    echo "Usage: ./start.sh [command]"
    echo ""
    echo "Commands:"
    echo "  install       Install all dependencies"
    echo "  dev           Start development servers (backend + frontend)"
    echo "  prod          Build frontend and start production server"
    echo "  backend       Start backend only (production mode)"
    echo "  backend-dev   Start backend with watch mode"
    echo "  frontend      Start frontend dev server only"
    echo "  help          Show this help"
    echo ""
    echo "Examples:"
    echo "  ./start.sh install"
    echo "  ./start.sh dev"
    echo "  ./start.sh prod"
}

main() {
    case "${1:-help}" in
        install)
            check_dependencies
            install_all
            ;;
        dev)
            check_dependencies
            start_dev
            ;;
        prod)
            check_dependencies
            start_prod
            ;;
        backend)
            check_dependencies
            start_backend_only prod
            ;;
        backend-dev)
            check_dependencies
            start_backend_only dev
            ;;
        frontend)
            check_dependencies
            start_frontend_only
            ;;
        help|*)
            show_help
            ;;
    esac
}

main "$@"