package models

import (
	"database/sql/driver"
	"fmt"
	"time"
)

// NullableTime is a time.Time wrapper that can represent NULL in both JSON and SQL.
// It accepts JSON null, empty string (""), and several common date/time formats.
// When stored as SQL, an invalid/zero NullableTime becomes NULL.
type NullableTime struct {
	Time  time.Time
	Valid bool
}

// NewNullableTime creates a NullableTime from a pointer. A nil pointer means invalid.
func NewNullableTime(t *time.Time) NullableTime {
	if t == nil {
		return NullableTime{}
	}
	return NullableTime{Time: *t, Valid: true}
}

// Ptr returns a pointer to the underlying time, or nil if invalid.
func (nt NullableTime) Ptr() *time.Time {
	if !nt.Valid {
		return nil
	}
	t := nt.Time
	return &t
}

// IsNull reports whether the value is invalid (NULL).
func (nt NullableTime) IsNull() bool {
	return !nt.Valid
}

func (nt *NullableTime) UnmarshalJSON(data []byte) error {
	s := string(data)
	if s == "null" || s == `""` {
		nt.Time = time.Time{}
		nt.Valid = false
		return nil
	}

	if len(s) >= 2 && s[0] == '"' && s[len(s)-1] == '"' {
		s = s[1 : len(s)-1]
	}

	layouts := []string{
		time.RFC3339,
		time.RFC3339Nano,
		"2006-01-02T15:04:05",
		"2006-01-02 15:04:05",
		"2006-01-02",
	}
	for _, layout := range layouts {
		if t, err := time.Parse(layout, s); err == nil {
			nt.Time = t
			nt.Valid = true
			return nil
		}
	}
	return fmt.Errorf("invalid time format: %s", string(data))
}

func (nt NullableTime) MarshalJSON() ([]byte, error) {
	if !nt.Valid {
		return []byte("null"), nil
	}
	return nt.Time.MarshalJSON()
}

// Value implements the driver Valuer interface.
func (nt NullableTime) Value() (driver.Value, error) {
	if !nt.Valid {
		return nil, nil
	}
	return nt.Time, nil
}

// Scan implements the sql Scanner interface.
func (nt *NullableTime) Scan(value interface{}) error {
	if value == nil {
		nt.Time = time.Time{}
		nt.Valid = false
		return nil
	}
	switch v := value.(type) {
	case time.Time:
		nt.Time = v
		nt.Valid = true
		return nil
	default:
		return fmt.Errorf("cannot scan %T into NullableTime", value)
	}
}
