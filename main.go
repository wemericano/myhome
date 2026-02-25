package main

import (
	"fmt"
	"log"
	"net/http"
)

func main() {
	http.HandleFunc("/api/health", healthHandler)
	http.Handle("/", http.FileServer(http.Dir(".")))

	port := "8080"
	fmt.Printf("서버 시작: http://localhost:%s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
