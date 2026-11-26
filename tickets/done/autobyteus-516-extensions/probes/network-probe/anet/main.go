// Probe-only "AutoByteus Network" program: one tsnet node in userspace mode (no TUN, no root).
// Talks to its caller with one JSON line per message on stdin/stdout, like the voice program.
// Serves GET /whoami on its private address: answers who the calling machine is (WhoIs).
package main

import (
	"bufio"
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"bytes"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"
	"time"

	"tailscale.com/tsnet"
)

type out map[string]any

func emit(v out) { b, _ := json.Marshal(v); fmt.Println(string(b)) }

func main() {
	name := flag.String("name", "", "machine name")
	dir := flag.String("dir", "", "state folder")
	control := flag.String("control", "", "coordination server URL")
	forward := flag.String("forward", "", "local AutoByteus server address (host:port) to forward incoming connections to")
	flag.Parse()
	s := &tsnet.Server{Hostname: *name, Dir: *dir, ControlURL: *control, AuthKey: os.Getenv("ANET_JOIN_KEY"), Logf: func(string, ...any) {}}
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	st, err := s.Up(ctx)
	cancel()
	if err != nil { emit(out{"type": "error", "error": err.Error()}); os.Exit(1) }
	lc, _ := s.LocalClient()
	ln, err := s.Listen("tcp", ":8000")
	if err != nil { emit(out{"type": "error", "error": err.Error()}); os.Exit(1) }
	mux := http.NewServeMux()
	mux.HandleFunc("/whoami", func(w http.ResponseWriter, r *http.Request) {
		who, err := lc.WhoIs(r.Context(), r.RemoteAddr)
		if err != nil { http.Error(w, err.Error(), 403); return }
		json.NewEncoder(w).Encode(out{"callerMachine": who.Node.ComputedName, "callerUser": who.UserProfile.LoginName, "servedBy": *name})
	})
	if *forward != "" {
		// Forward everything else to the local AutoByteus server, with the network-verified caller attached.
		target, _ := url.Parse("http://" + *forward)
		proxy := httputil.NewSingleHostReverseProxy(target)
		mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			who, err := lc.WhoIs(r.Context(), r.RemoteAddr)
			if err != nil { http.Error(w, err.Error(), 403); return }
			for name := range r.Header {
				if strings.HasPrefix(strings.ToLower(name), "x-network-caller") { r.Header.Del(name) }
			}
			r.Header.Set("X-Network-Caller-Machine", strings.SplitN(who.Node.ComputedName, ".", 2)[0])
			r.Header.Set("X-Network-Caller-Account", who.UserProfile.LoginName)
			proxy.ServeHTTP(w, r)
		})
	}
	go http.Serve(ln, mux)
	// Local relay (gap G1): an HTTP/SOCKS5 proxy on 127.0.0.1 through which a local app reaches private addresses.
	relayAddr, relayCred, _, err := s.Loopback()
	if err != nil { emit(out{"type": "error", "error": err.Error()}); os.Exit(1) }
	emit(out{"type": "ready", "ip": st.TailscaleIPs[0].String(), "name": *name, "relay": relayAddr, "relayCredential": relayCred})

	client := s.HTTPClient()
	client.Timeout = 10 * time.Second
	in := bufio.NewScanner(os.Stdin)
	for in.Scan() {
		var cmd map[string]string
		if json.Unmarshal(in.Bytes(), &cmd) != nil { continue }
		switch cmd["cmd"] {
		case "status":
			status, err := lc.Status(context.Background())
			if err != nil { emit(out{"id": cmd["id"], "error": err.Error()}); continue }
			peers := []out{}
			for _, p := range status.Peer {
				user := status.User[p.UserID].LoginName
				peers = append(peers, out{"name": p.HostName, "ip": p.TailscaleIPs[0].String(), "online": p.Online, "user": user})
			}
			emit(out{"id": cmd["id"], "self": out{"name": status.Self.HostName, "user": status.User[status.Self.UserID].LoginName}, "peers": peers})
		case "get":
			resp, err := client.Get(cmd["url"])
			if err != nil { emit(out{"id": cmd["id"], "error": err.Error()}); continue }
			body, _ := io.ReadAll(resp.Body)
			resp.Body.Close()
			emit(out{"id": cmd["id"], "status": resp.StatusCode, "body": string(body)})
		case "request":
			// The local AutoByteus server's outgoing call to another machine on the private network.
			req, _ := http.NewRequest(cmd["method"], cmd["url"], bytes.NewBufferString(cmd["body"]))
			var headers map[string]string
			json.Unmarshal([]byte(cmd["headers"]), &headers)
			for k, v := range headers { req.Header.Set(k, v) }
			resp, err := client.Do(req)
			if err != nil { emit(out{"id": cmd["id"], "error": err.Error()}); continue }
			body, _ := io.ReadAll(resp.Body)
			resp.Body.Close()
			emit(out{"id": cmd["id"], "status": resp.StatusCode, "body": string(body)})
		case "quit":
			s.Close()
			return
		}
	}
	s.Close()
}
