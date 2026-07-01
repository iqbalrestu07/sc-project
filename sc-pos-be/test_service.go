package main

import (
	"encoding/json"
	"fmt"
	"log"

	"github.com/joho/godotenv"
	"github.com/sc-pos/backend/internal/modules/whatsapp"
	"github.com/sc-pos/backend/internal/database"
)

func main() {
	godotenv.Load(".env")
	database.ConnectDB()

	// Initialize whatsmeow store and client manager
	whatsapp.InitClientManager()

	svc := whatsapp.NewService()
	
	// Assuming org ID is "d7cff144-6c6d-42c8-b1bf-645db1213681" based on previous logs
	devices, err := svc.GetDevices("d7cff144-6c6d-42c8-b1bf-645db1213681")
	if err != nil {
		log.Fatal(err)
	}

	out, _ := json.MarshalIndent(devices, "", "  ")
	fmt.Println("DEVICES JSON:")
	fmt.Println(string(out))
}
