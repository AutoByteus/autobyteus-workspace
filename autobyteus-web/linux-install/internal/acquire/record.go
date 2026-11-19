// Package acquire obtains first-install sidecars as the desktop user before any authorization.
package acquire

import (
	"context"
	"crypto/ed25519"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"time"

	"autobyteus.local/desktop/linux-install/internal/release"
)

// ErrUnverifiedDownload is safe for the install dialog. Do not put remote data,
// download paths or signed redirect URLs in the user-facing refusal.
var ErrUnverifiedDownload = errors.New("AutoByteus could not verify this AppImage against its official release. Download a fresh copy from the official AutoByteus releases page. If verification still fails, contact AutoByteus support.")

var errReleaseConnection = errors.New("cannot reach official release service; reconnect and retry")

// Identity comes from the build, never the downloaded filename, argv or environment.
type Identity struct {
	Version    string
	Arch       string
	Repository string
	Asset      string
}

func (i Identity) URL() (string, error) {
	if _, err := release.VersionChannel(i.Version); err != nil {
		return "", err
	}
	if (i.Arch != "x64" && i.Arch != "arm64") || i.Repository != "AutoByteus/autobyteus-workspace" ||
		i.Asset != "AutoByteus_personal_linux-"+i.Arch+"-"+i.Version+".AppImage" {
		return "", fmt.Errorf("invalid build release identity")
	}
	return "https://github.com/" + i.Repository + "/releases/download/v" + i.Version + "/" + i.Asset + ".release.json", nil
}

func productionURL(u *url.URL) bool {
	return u.Scheme == "https" && u.User == nil && (u.Port() == "" || u.Port() == "443") &&
		(u.Hostname() == "github.com" || u.Hostname() == "release-assets.githubusercontent.com")
}

func client() *http.Client {
	return &http.Client{Timeout: 20 * time.Second, CheckRedirect: func(req *http.Request, via []*http.Request) error {
		if len(via) > 3 || !permitted(req.URL) {
			return fmt.Errorf("release redirect refused")
		}
		return nil
	}}
}

func get(ctx context.Context, client *http.Client, address string, limit int64) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, address, nil)
	if err != nil || !permitted(req.URL) {
		return nil, ErrUnverifiedDownload
	}
	response, err := client.Do(req)
	// Do not propagate net/http errors containing signed redirect query strings.
	if err != nil {
		return nil, errReleaseConnection
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("The official verification files for this release are unavailable (HTTP %d). Try again later. If the files are still unavailable, contact AutoByteus support.", response.StatusCode)
	}
	data, err := io.ReadAll(io.LimitReader(response.Body, limit+1))
	if err != nil {
		return nil, errReleaseConnection
	}
	if int64(len(data)) > limit {
		return nil, ErrUnverifiedDownload
	}
	return data, nil
}

// Fetch verifies the opened outer image and rewinds that same handle for provisioning.
// The handle is NOT immutable: the privileged receiver must verify streamed bytes independently.
func Fetch(ctx context.Context, identity Identity, key ed25519.PublicKey, image *os.File) ([]byte, []byte, error) {
	if os.Geteuid() == 0 {
		return nil, nil, fmt.Errorf("release acquisition must not run as root")
	}
	address, err := acquisitionURL(identity)
	if err != nil {
		return nil, nil, ErrUnverifiedDownload
	}
	ctx, cancel := context.WithTimeout(ctx, 20*time.Second)
	defer cancel()
	c := client()
	data, err := get(ctx, c, address, release.MaxRecord)
	if err != nil {
		return nil, nil, err
	}
	encoded, err := get(ctx, c, address+".sig", 88)
	if err != nil {
		return nil, nil, err
	}
	signature, err := verifyDownload(identity, key, image, data, encoded)
	if err != nil {
		return nil, nil, ErrUnverifiedDownload
	}
	return data, signature, nil
}

func verifyDownload(identity Identity, key ed25519.PublicKey, image *os.File, data, encoded []byte) ([]byte, error) {
	signature, err := release.DecodeSignature(encoded)
	if err != nil {
		return nil, err
	}
	r, err := release.Verify(data, signature, key, identity.Arch)
	if err != nil {
		return nil, err
	}
	if r.Version != identity.Version {
		return nil, fmt.Errorf("release version differs from running download")
	}
	stat, err := image.Stat()
	if err != nil || !stat.Mode().IsRegular() || stat.Size() != r.Size {
		return nil, fmt.Errorf("outer AppImage is not the signed regular file")
	}
	if _, err = image.Seek(0, io.SeekStart); err != nil {
		return nil, err
	}
	if err = r.Copy(io.Discard, image); err != nil {
		return nil, err
	}
	if _, err = image.Seek(0, io.SeekStart); err != nil {
		return nil, err
	}
	return signature, nil
}
