package main

import (
	"encoding/json"
	"fmt"
	"log"

	"github.com/joho/godotenv"
	"github.com/sc-pos/backend/config"
	"github.com/sc-pos/backend/internal/database"
	"github.com/sc-pos/backend/internal/modules/whatsapp"
)

func main() {
	godotenv.Load(".env")
	cfg := config.Load()

	if err := database.Connect(cfg.Database.DSN()); err != nil {
		log.Fatal(err)
	}

	whatsapp.InitClientManager(cfg.Database.DSN())
	svc := whatsapp.NewService()

	devices, err := svc.GetDevices("d7cff144-6c6d-42c8-b1bf-645db1213681")
	if err != nil {
		log.Fatal(err)
	}

	out, _ := json.MarshalIndent(devices, "", "  ")
	fmt.Println("API Output:")
	fmt.Println(string(out))
}
