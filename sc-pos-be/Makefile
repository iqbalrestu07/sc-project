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

build-arm-rpi:
	@echo "Building application for ARM..."
	GOOS=linux GOARCH=arm GOARM=7 CGO_ENABLED=0 go build -o bin/sc-pos-be main.go

build-arm-generic:
	@echo "Building application for ARM..."
	GOOS=linux GOARCH=arm CGO_ENABLED=0 go build -o bin/sc-pos-be main.go

build-windows:
	@echo "Building application for Windows..."
	GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -o bin/sc-pos-be main.go

build-linux:
	@echo "Building application for Linux..."
	GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -o bin/sc-pos-be main.go

run:
	@echo "Running application..."
	./bin/sc-pos-be

test:
	@echo "Running tests..."
	go test ./...

clean:
	@echo "Cleaning build artifacts..."
	rm -rf bin/
kill:
	@echo "Killing running application..."
	@pkill -f sc-pos-be || true
	@pkill -f "go run main.go" 2>/dev/null; pkill -f "/exe/main" 2>/dev/null; sleep 1; echo "killed"

# Database migrations with psql
migrate-up:
	@echo "Running migrations..."
	psql $(DATABASE_URL) < migrations/migrations.sql

migrate-down:
	@echo "Rolling back migrations..."
	@echo "TODO: Implement rollback"
