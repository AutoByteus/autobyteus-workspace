//go:build desktop_test

package acquire

import (
	"fmt"
	"net/url"
	"strings"
)

// Set only by the build-only tool with a disposable signing identity. Production
// builds exclude this source file and have no runtime or link-time origin override.
var testOrigin string

func permitted(u *url.URL) bool {
	base, err := url.Parse(testOrigin)
	return err == nil && u.User == nil && u.Scheme == base.Scheme && u.Host == base.Host && (u.Hostname() == "127.0.0.1" || u.Hostname() == "localhost")
}
func acquisitionURL(identity Identity) (string, error) {
	address, err := identity.URL()
	if err != nil {
		return "", err
	}
	u, err := url.Parse(testOrigin)
	if err != nil || !permitted(u) || u.RawQuery != "" || u.Path != "" || u.Fragment != "" {
		return "", fmt.Errorf("invalid isolated build-only origin")
	}
	return strings.Replace(address, "https://github.com", testOrigin, 1), nil
}
