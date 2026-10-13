package docker

import (
	"bytes"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"
)

func (c *Client) Exec(container string, command []string) ([]byte, error) {
	var created struct {
		ID string `json:"Id"`
	}
	if err := c.Call("POST", "/containers/"+container+"/exec", Object{"AttachStdout": true, "AttachStderr": true, "Cmd": command}, &created); err != nil {
		return nil, err
	}
	b, _ := json.Marshal(Object{"Detach": false, "Tty": false})
	req, err := http.NewRequest("POST", "http://docker"+apiPrefix+"/exec/"+created.ID+"/start", bytes.NewReader(b))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	res, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	if res.StatusCode != 200 {
		return nil, fmt.Errorf("Docker exec start status %d", res.StatusCode)
	}
	raw, err := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if err != nil {
		return nil, err
	}
	var out bytes.Buffer
	for len(raw) > 0 {
		if len(raw) < 8 {
			return nil, errors.New("truncated Docker stream header")
		}
		n := int(binary.BigEndian.Uint32(raw[4:8]))
		raw = raw[8:]
		if n > len(raw) {
			return nil, errors.New("truncated Docker stream payload")
		}
		out.Write(raw[:n])
		raw = raw[n:]
	}
	var state struct {
		Running  bool
		ExitCode int
	}
	if err = c.Call("GET", "/exec/"+created.ID+"/json", nil, &state); err != nil {
		return nil, err
	}
	if state.Running {
		return nil, errors.New("exec still running; readiness incomplete")
	}
	if state.ExitCode != 0 {
		return out.Bytes(), fmt.Errorf("node check failed (exit %d)", state.ExitCode)
	}
	return out.Bytes(), nil
}
func (c *Client) VerifyStarted(container, root string, shared bool) error {
	// These are normal startup retries, not an NFS I/O timeout or per-action probe.
	script := `const p=process.env.AUTOBYTEUS_SERVER_PORT||'8000';const r=await fetch('http://127.0.0.1:'+p+'/rest/health');if(!r.ok)throw Error('server not healthy');`
	if shared {
		script += `const m=await import('/app/autobyteus-server-ts/dist/workspaces/shared-workspace-binding.js');if(!await m.checkSharedWorkspaceForRun(process.argv[1]))throw Error('attachment absent');`
	}
	var err error
	for attempt := 0; attempt < 20; attempt++ {
		_, err = c.Exec(container, []string{"node", "--input-type=module", "-e", script, root})
		if err == nil {
			return nil
		}
		time.Sleep(time.Second)
	}
	return err
}
