package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
)

func main() {
	loginData := map[string]string{
		"email":    "iqbal.restu07@gmail.com",
		"password": "123456",
	}
	body, _ := json.Marshal(loginData)

	resp, err := http.Post("http://localhost:8080/api/auth/login", "application/json", bytes.NewBuffer(body))
	if err != nil {
		fmt.Println("Error login:", err)
		return
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)
	
	if result["data"] == nil {
		fmt.Println("Login failed")
		return
	}
	data := result["data"].(map[string]interface{})
	token := data["access_token"].(string)
	orgs := data["user"].(map[string]interface{})["organizations"].([]interface{})
	orgId := orgs[0].(map[string]interface{})["organization_id"].(string)

	req, _ := http.NewRequest("GET", "http://localhost:8080/api/whatsapp/devices", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("X-Organization-ID", orgId)

	client := &http.Client{}
	resp2, _ := client.Do(req)
	defer resp2.Body.Close()

	body2, _ := ioutil.ReadAll(resp2.Body)
	fmt.Println("Devices Response:", string(body2))
}
