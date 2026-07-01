package main

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/joho/godotenv"
	"github.com/sc-pos/backend/internal/database"
	"github.com/sc-pos/backend/internal/modules/whatsapp"
)

func main() {
	godotenv.Load(".env")
	database.ConnectDB()

	// Assuming 'uploads/cms' as standard upload dir from .env
	whatsapp.InitClientManager("uploads/cms")

	svc := whatsapp.NewService()

	devices, _ := svc.GetDevices("d7cff144-6c6d-42c8-b1bf-645db1213681")
	out, _ := json.MarshalIndent(devices, "", "  ")
	fmt.Println(string(out))
	os.Exit(0)
}
