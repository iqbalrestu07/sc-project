# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM golang:1.26-alpine AS builder

WORKDIR /app

# Download dependencies first (cache layer)
COPY go.mod go.sum ./
RUN go mod download

# Copy source and build
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o server .

# ─── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM alpine:3.19

WORKDIR /app

# ca-certificates for HTTPS outbound calls (e.g. WhatsApp)
RUN apk add --no-cache ca-certificates tzdata

# Copy binary from builder
COPY --from=builder /app/server .

# Create uploads directory
RUN mkdir -p uploads/cms

EXPOSE 8080

CMD ["./server"]
