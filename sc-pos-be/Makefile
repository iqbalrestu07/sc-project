.PHONY: help build run dev test clean install-deps migrate

help:
	@echo "SC-POS Backend - Available commands:"
	@echo "  make install-deps    Install go dependencies"
	@echo "  make dev             Run in development mode"
	@echo "  make build           Build the application"
	@echo "  make run             Run the built application"
	@echo "  make test            Run tests"
	@echo "  make clean           Clean build artifacts"

install-deps:
	@echo "Installing dependencies..."
	go mod download
	go mod tidy

dev:
	@echo "Running in development mode..."
	go run main.go

build:
	@echo "Building application..."
	go build -o bin/sc-pos-backend main.go

run:
	@echo "Running application..."
	./bin/sc-pos-backend

test:
	@echo "Running tests..."
	go test ./...

clean:
	@echo "Cleaning build artifacts..."
	rm -rf bin/

# Database migrations with psql
migrate-up:
	@echo "Running migrations..."
	psql $(DATABASE_URL) < migrations/migrations.sql

migrate-down:
	@echo "Rolling back migrations..."
	@echo "TODO: Implement rollback"
