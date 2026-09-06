package utils

import (
	"testing"
)

func TestNewUUID(t *testing.T) {
	id1 := NewUUID()
	id2 := NewUUID()

	if id1 == "" {
		t.Error("Expected UUID string, got empty string")
	}

	if id1 == id2 {
		t.Error("Expected UUIDs to be unique")
	}
}
