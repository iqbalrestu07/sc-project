package utils

import "time"

// JakartaLocation is the Asia/Jakarta time zone (UTC+7). It falls back to a
// fixed offset if the host time zone database is unavailable.
var JakartaLocation = func() *time.Location {
	loc, err := time.LoadLocation("Asia/Jakarta")
	if err != nil {
		return time.FixedZone("Asia/Jakarta", 7*60*60)
	}
	return loc
}()

// ToJakarta converts an absolute instant to the Asia/Jakarta time zone. Use
// this for RFC3339 input or query parameters that encode an instant but should
// be viewed/stored as Jakarta wall-clock time.
func ToJakarta(t time.Time) time.Time {
	if t.IsZero() {
		return t
	}
	return t.In(JakartaLocation)
}

// JakartaWallClock treats the year/month/day/hour/minute/second of t as a
// wall-clock value in Asia/Jakarta. Use this for values read from TIMESTAMP
// (without time zone) columns, which the driver returns in UTC with the same
// wall-clock digits.
func JakartaWallClock(t time.Time) time.Time {
	if t.IsZero() {
		return t
	}
	return time.Date(t.Year(), t.Month(), t.Day(), t.Hour(), t.Minute(), t.Second(), t.Nanosecond(), JakartaLocation)
}
