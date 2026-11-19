package acquire

import (
	"context"
	"io"
	"net/http"
	"net/url"
	"strings"
	"testing"
)

type transport func(*http.Request) (*http.Response, error)

func (t transport) RoundTrip(r *http.Request) (*http.Response, error) { return t(r) }
func TestBuildPinnedAddress(t *testing.T) {
	identity := Identity{"1.5.13", "x64", "AutoByteus/autobyteus-workspace", "AutoByteus_personal_linux-x64-1.5.13.AppImage"}
	address, err := identity.URL()
	if err != nil {
		t.Fatal(err)
	}
	if address != "https://github.com/AutoByteus/autobyteus-workspace/releases/download/v1.5.13/AutoByteus_personal_linux-x64-1.5.13.AppImage.release.json" {
		t.Fatal(address)
	}
	identity.Asset = "My renamed download.AppImage"
	if _, err = identity.URL(); err == nil {
		t.Fatal("filename identity accepted")
	}
}
func TestRedirectPolicy(t *testing.T) {
	for _, address := range []string{"http://github.com/a", "https://evil.example/a", "https://github.com.evil.example/a", "https://x@github.com/a", "https://github.com:444/a"} {
		u, _ := url.Parse(address)
		if permitted(u) {
			t.Fatal(address)
		}
	}
	for _, address := range []string{"https://github.com/a", "https://release-assets.githubusercontent.com/a?secret=redacted"} {
		u, _ := url.Parse(address)
		if !permitted(u) {
			t.Fatal(address)
		}
	}
	req, _ := http.NewRequest("GET", "https://github.com/a", nil)
	if err := client().CheckRedirect(req, make([]*http.Request, 4)); err == nil {
		t.Fatal("fourth redirect accepted")
	}
	if err := client().CheckRedirect(req, make([]*http.Request, 3)); err != nil {
		t.Fatal(err)
	}
}
func TestResponseBoundsAndStatus(t *testing.T) {
	for _, test := range []struct {
		status, size int
		valid        bool
	}{{200, 4096, true}, {200, 4097, false}, {404, 1, false}, {206, 1, false}} {
		c := client()
		c.Transport = transport(func(req *http.Request) (*http.Response, error) {
			return &http.Response{StatusCode: test.status, Body: io.NopCloser(strings.NewReader(strings.Repeat("x", test.size))), Header: make(http.Header), Request: req}, nil
		})
		_, err := get(context.Background(), c, "https://github.com/sidecar", 4096)
		if (err == nil) != test.valid {
			t.Fatalf("%+v: %v", test, err)
		}
	}
}
