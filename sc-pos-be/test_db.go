package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/lib/pq"
	"github.com/joho/godotenv"
	"os"
)

func main() {
	godotenv.Load(".env")
	
	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		os.Getenv("DB_HOST"), os.Getenv("DB_PORT"), os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"), os.Getenv("DB_NAME"), os.Getenv("DB_SSLMODE"))

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal(err)
	}

	var count int
	err = db.QueryRow("SELECT COUNT(*) FROM omni_conversations").Scan(&count)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("Conversations Count:", count)
	
	err = db.QueryRow("SELECT COUNT(*) FROM omni_messages").Scan(&count)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("Messages Count:", count)
}
