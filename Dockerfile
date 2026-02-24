FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod ./
COPY main.go ./
RUN go build -o server .

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/server .
COPY *.html .
COPY *.png .
EXPOSE 8080
CMD ["./server"]
