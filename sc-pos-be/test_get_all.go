package main

import (
	"fmt"
	"log"
	"context"

	"github.com/joho/godotenv"
	"github.com/sc-pos/backend/config"
	"go.mau.fi/whatsmeow/store/sqlstore"
	waLog "go.mau.fi/whatsmeow/util/log"
)

func main() {
	godotenv.Load(".env")
	cfg := config.Load()

	container := sqlstore.New("postgres", cfg.Database.DSN(), waLog.Stdout("Database", "DEBUG", true))
	
	devices, err := container.GetAllDevices(context.Background())
	if err != nil {
		log.Fatal(err)
	}

	for _, d := range devices {
		fmt.Println("Device in Store:", d.ID.String())
	}
}
