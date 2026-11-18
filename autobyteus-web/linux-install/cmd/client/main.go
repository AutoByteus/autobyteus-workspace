// Unprivileged Electron adapter: download verification and fixed writer IPC only.
package main

import (
	"context"
	"crypto/ed25519"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"os"
	"strconv"
	"time"

	"autobyteus.local/desktop/linux-install/internal/acquire"
	"autobyteus.local/desktop/linux-install/internal/buildinfo"
	"autobyteus.local/desktop/linux-install/internal/imagefile"
	"autobyteus.local/desktop/linux-install/internal/install"
	"autobyteus.local/desktop/linux-install/internal/launch"
	"autobyteus.local/desktop/linux-install/internal/protocol"
	"autobyteus.local/desktop/linux-install/internal/release"
)

func exchange(socket string, q protocol.Request, payload io.Reader) (protocol.Response, error) {
	var response protocol.Response
	connection, err := net.DialTimeout("unix", socket, 10*time.Second)
	if err != nil {
		return response, err
	}
	defer connection.Close()
	connection.SetDeadline(time.Now().Add(3 * time.Minute))
	if err = json.NewEncoder(connection).Encode(q); err != nil {
		return response, err
	}
	if payload != nil {
		if _, err = io.Copy(connection, payload); err != nil {
			return response, err
		}
	}
	if err = connection.(*net.UnixConn).CloseWrite(); err != nil {
		return response, err
	}
	raw, err := io.ReadAll(io.LimitReader(connection, protocol.MaxHeader+1))
	if err != nil {
		return response, err
	}
	if len(raw) > protocol.MaxHeader {
		return response, fmt.Errorf("writer response exceeds bounds")
	}
	if err = json.Unmarshal(raw, &response); err != nil {
		return response, err
	}
	if response.Error != "" {
		return response, fmt.Errorf("writer refused: %s", response.Error)
	}
	return response, nil
}
func authenticated(response protocol.Response, key ed25519.PublicKey, arch string) (release.Record, error) {
	return release.Verify(response.Record, response.Signature, key, arch)
}
func run() (protocol.Response, error) {
	empty := protocol.Response{}
	if os.Geteuid() == 0 || len(os.Args) < 2 {
		return empty, fmt.Errorf("desktop client requires unprivileged invocation")
	}
	identity, key, err := buildinfo.Identity()
	if err != nil {
		return empty, err
	}
	p, err := install.ForUID(strconv.Itoa(os.Getuid()))
	if err != nil {
		return empty, err
	}
	if _, managed, err := launch.Managed(p); err != nil || !managed {
		return empty, fmt.Errorf("protected installation unavailable")
	}
	args := os.Args[1:]
	switch args[0] {
	case "status":
		if len(args) != 1 {
			return empty, fmt.Errorf("invalid status arguments")
		}
		response, err := exchange(p.Socket, protocol.Request{Operation: "status"}, nil)
		if err != nil {
			return empty, err
		}
		_, err = authenticated(response, key, identity.Arch)
		return response, err
	case "stage":
		if len(args) != 4 {
			return empty, fmt.Errorf("invalid stage arguments")
		}
		// The candidate is selected by the downloader; it is never installed on that claim alone.
		identity.Version = args[2]
		identity.Asset = "AutoByteus_personal_linux-" + identity.Arch + "-" + identity.Version + ".AppImage"
		current, err := exchange(p.Socket, protocol.Request{Operation: "status"}, nil)
		if err != nil {
			return empty, err
		}
		baseline, err := authenticated(current, key, identity.Arch)
		if err != nil {
			return empty, err
		}
		f, err := imagefile.Open(args[1])
		if err != nil {
			return empty, err
		}
		defer f.Close()
		data, signature, err := acquire.Fetch(context.Background(), identity, key, f)
		if err != nil {
			return empty, err
		}
		candidate, err := release.Verify(data, signature, key, identity.Arch)
		if err != nil {
			return empty, err
		}
		if err = release.Admit(candidate, baseline, args[3]); err != nil {
			return empty, err
		}
		response, err := exchange(p.Socket, protocol.Request{Operation: "stage", Record: data, Signature: signature, Channel: args[3], ExpectedDigest: baseline.SHA256}, f)
		if err != nil {
			return empty, err
		}
		if _, err = authenticated(response, key, identity.Arch); err != nil {
			return empty, err
		}
		// The expected live digest belongs to this exact staged transaction, not a later status query.
		if response.ExpectedDigest != baseline.SHA256 {
			return empty, fmt.Errorf("stage baseline differs from verified current identity")
		}
		return response, nil
	case "activate":
		if len(args) != 4 {
			return empty, fmt.Errorf("invalid activation arguments")
		}
		response, err := exchange(p.Socket, protocol.Request{Operation: "activate", StageID: args[1], ExpectedDigest: args[2], Channel: args[3]}, nil)
		if err != nil {
			return response, err
		}
		_, err = authenticated(response, key, identity.Arch)
		return response, err
	case "discard":
		if len(args) != 2 {
			return empty, fmt.Errorf("invalid discard arguments")
		}
		return exchange(p.Socket, protocol.Request{Operation: "discard", StageID: args[1]}, nil)
	default:
		return empty, fmt.Errorf("unknown client operation")
	}
}
func main() {
	response, err := run()
	if err != nil {
		if response.Code == protocol.StageGone && response.Error != "" {
			json.NewEncoder(os.Stdout).Encode(response)
			return
		}
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	json.NewEncoder(os.Stdout).Encode(response)
}
