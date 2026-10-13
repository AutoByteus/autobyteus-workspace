// Package docker manages exact selected local-daemon resources without invoking the general launcher.
package docker

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
)

const apiPrefix = "/v1.47"
const launcherLabel = "com.autobyteus.launcher"
const nodeLabel = "com.autobyteus.nodeName"
const storageLabel = "com.autobyteus.nfs.storageId"

type Client struct {
	http   *http.Client
	Socket string
}
type APIError struct {
	Status  int
	Message string
}

func (e *APIError) Error() string { return fmt.Sprintf("Docker API %d: %s", e.Status, e.Message) }
func IsMissing(err error) bool    { var e *APIError; return errors.As(err, &e) && e.Status == 404 }
func New(socket string) (*Client, error) {
	if !filepath.IsAbs(socket) || strings.ContainsAny(socket, "\x00\r\n") {
		return nil, errors.New("Docker endpoint must be a local Unix socket")
	}
	info, err := os.Stat(socket)
	if err != nil {
		return nil, err
	}
	if info.Mode()&os.ModeSocket == 0 {
		return nil, errors.New("Docker endpoint is not a socket")
	}
	t := &http.Transport{DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
		return (&net.Dialer{}).DialContext(ctx, "unix", socket)
	}}
	return &Client{http: &http.Client{Transport: t}, Socket: socket}, nil
}
func (c *Client) Close() { c.http.CloseIdleConnections() }
func (c *Client) Call(method, path string, input, output any) error {
	var body io.Reader
	if input != nil {
		b, err := json.Marshal(input)
		if err != nil {
			return err
		}
		body = bytes.NewReader(b)
	}
	req, err := http.NewRequest(method, "http://docker"+apiPrefix+path, body)
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	res, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	b, err := io.ReadAll(io.LimitReader(res.Body, 8<<20))
	if err != nil {
		return err
	}
	if len(b) >= 8<<20 {
		return errors.New("Docker response exceeds bound")
	}
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		var e struct {
			Message string `json:"message"`
		}
		_ = json.Unmarshal(b, &e)
		return &APIError{Status: res.StatusCode, Message: e.Message}
	}
	if output != nil && len(b) > 0 {
		return json.Unmarshal(b, output)
	}
	return nil
}
func (c *Client) Inspect(id string) (Snapshot, error) {
	var s Snapshot
	err := c.Call("GET", "/containers/"+url.PathEscape(id)+"/json", nil, &s)
	return s, err
}
func (c *Client) Discover() ([]Snapshot, error) {
	filters := url.QueryEscape(`{"label":["` + launcherLabel + `=server-docker"]}`)
	var entries []struct {
		ID string `json:"Id"`
	}
	if err := c.Call("GET", "/containers/json?all=1&filters="+filters, nil, &entries); err != nil {
		return nil, err
	}
	result := []Snapshot{}
	names := map[string]bool{}
	for _, e := range entries {
		s, err := c.Inspect(e.ID)
		if err != nil {
			return nil, err
		}
		name := s.Node()
		if names[name] {
			return nil, errors.New("ambiguous managed node labels; nothing will be stopped")
		}
		names[name] = true
		result = append(result, s)
	}
	return result, nil
}
func (c *Client) Start(id string) error {
	return c.Call("POST", "/containers/"+url.PathEscape(id)+"/start", nil, nil)
}
func (c *Client) Stop(id string) error {
	return c.Call("POST", "/containers/"+url.PathEscape(id)+"/stop?t=30", nil, nil)
}
func (c *Client) Rename(id, name string) error {
	return c.Call("POST", "/containers/"+url.PathEscape(id)+"/rename?name="+url.QueryEscape(name), nil, nil)
}
func (c *Client) Remove(id string) error {
	return c.Call("DELETE", "/containers/"+url.PathEscape(id)+"?v=false&force=false", nil, nil)
}
func (c *Client) Create(name string, payload map[string]any) (string, error) {
	var out struct {
		ID string `json:"Id"`
	}
	err := c.Call("POST", "/containers/create?name="+url.QueryEscape(name), payload, &out)
	if err == nil && out.ID == "" {
		err = errors.New("Docker create returned no container identity")
	}
	return out.ID, err
}
