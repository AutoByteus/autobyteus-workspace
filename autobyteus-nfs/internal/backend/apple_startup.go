package backend

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/platform"
)

// Apple activation can finish before RPC registration/serving. At this backend
// boundary only, require registered TCP ports AND actual v3 NULL replies. The
// caller retains the administrative lock. No daemon, mount, export authorization
// or nonroot probe is retried; no per-action/outage policy is introduced.
func waitAppleRPC(r platform.Runner, endpoint string) error {
	return appleRPCStartup(r, endpoint, time.Now, time.Sleep)
}

func appleRPCStartup(r platform.Runner, endpoint string, now func() time.Time, pause func(time.Duration)) error {
	deadline := now().Add(30 * time.Second)
	for {
		starting, err := observeAppleRPC(r, endpoint)
		if err == nil {
			return nil
		}
		if !starting {
			return fmt.Errorf("Apple NFS startup at %s: %w", endpoint, err)
		}
		if !now().Before(deadline) {
			return fmt.Errorf("Apple NFS at %s did not become RPC-ready during startup; setup remains incomplete: %w", endpoint, err)
		}
		pause(250 * time.Millisecond)
	}
}

func observeAppleRPC(r platform.Runner, endpoint string) (bool, error) {
	out, err := r.Run("/usr/sbin/rpcinfo", "--timeout", "2", "-p", endpoint)
	if err != nil {
		return appleRPCStarting(string(out)), err
	}
	ports, err := appleTCPPorts(string(out))
	if err != nil {
		return false, err
	}
	if ports[0] == "" || ports[1] == "" {
		return true, errors.New("TCP NFSv3/MOUNTv3 not yet registered")
	}
	for i, program := range []string{"100003", "100005"} {
		// Explicit registered ports avoid Apple's implicit-lookup path, which can
		// send a program NULL to port111 after a cold portmapper lookup failure.
		out, err = r.Run("/usr/sbin/rpcinfo", "--timeout", "2", "-n", ports[i], "-t", endpoint, program, "3")
		if err != nil {
			return appleRPCStarting(string(out)), fmt.Errorf("TCP program %s v3: %w", program, err)
		}
	}
	return false, nil
}

// rpcinfo -p's C-locale table is registration evidence, NOT serving evidence.
func appleTCPPorts(output string) ([2]string, error) {
	var ports [2]string
	lines := strings.Split(strings.TrimSpace(output), "\n")
	if strings.Join(strings.Fields(lines[0]), " ") != "program vers proto port" {
		return ports, errors.New("unexpected Apple RPC registration response")
	}
	for _, line := range lines[1:] {
		fields := strings.Fields(line)
		if len(fields) == 0 {
			continue
		}
		if len(fields) < 4 {
			return ports, errors.New("malformed Apple RPC registration row")
		}
		for i, program := range []string{"100003", "100005"} {
			if fields[0] != program || fields[1] != "3" || fields[2] != "tcp" {
				continue
			}
			port, err := strconv.Atoi(fields[3])
			if err != nil || port < 1 || port > 65535 || ports[i] != "" {
				return ports, errors.New("invalid/duplicate Apple RPC registration port")
			}
			ports[i] = strconv.Itoa(port)
		}
	}
	return ports, nil
}

// Commands fixes LC_ALL=C. Only known not-yet-serving RPC conditions receive
// startup observation time. Authentication/version/procedure/config/execution
// errors fail immediately, rather than being hidden by blanket retries.
func appleRPCStarting(output string) bool {
	for _, message := range []string{
		"RPC: Program not registered",
		"RPC: Remote system error - Connection refused",
		"RPC: Timed out",
		"RPC: Unable to send; errno = Broken pipe",
	} {
		if strings.Contains(output, message) {
			return true
		}
	}
	return false
}
