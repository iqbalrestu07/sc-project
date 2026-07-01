package main

import (
	"fmt"
	"go.mau.fi/whatsmeow/types/events"
	"reflect"
)

func main() {
	var evt *events.Message
	t := reflect.TypeOf(evt).Elem()
	for i := 0; i < t.NumField(); i++ {
		fmt.Printf("Field %d: %s %s\n", i, t.Field(i).Name, t.Field(i).Type.String())
	}
}
