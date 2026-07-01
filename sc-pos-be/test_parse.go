package main

import (
	"fmt"
	"go.mau.fi/whatsmeow"
	"reflect"
)

func main() {
	var client *whatsmeow.Client
	t := reflect.TypeOf(client)
	for i := 0; i < t.NumMethod(); i++ {
		m := t.Method(i)
		if m.Name == "ParseWebMessage" {
			fmt.Printf("ParseWebMessage signature: %s\n", m.Type.String())
			return
		}
	}
}
