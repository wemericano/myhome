FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
COPY main.go handler.go ./
RUN go build -o server .

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/server .
COPY *.html .
COPY *.png .
EXPOSE 8080
CMD ["./server"]
