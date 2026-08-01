package utils

import "github.com/google/uuid"

// NewUUID generates a time-sortable UUIDv7.
//
// UUIDv7 combines a Unix millisecond timestamp (first 48 bits) with random bits,
// producing IDs that are lexicographically sortable by creation time. This gives
// better B-tree index locality than random UUIDv4 — new rows append to the end
// of indexes instead of being scattered, reducing page splits and write
// amplification.
//
// The error return from uuid.NewV7() only occurs if the system clock is broken
// or the crypto random source is unavailable — both are fatal conditions that
// would break far more than ID generation. We panic in those cases rather than
// forcing every caller to handle an error that effectively never happens.
func NewUUID() string {
	id, err := uuid.NewV7()
	if err != nil {
		// Fallback to UUIDv4 if UUIDv7 fails (should never happen in practice)
		return uuid.New().String()
	}
	return id.String()
}
