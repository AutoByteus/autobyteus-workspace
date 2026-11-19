package launch

import (
	"os"
	"path/filepath"
	"testing"
)

// Inert process fixtures prove classification/readiness and exit forwarding, not
// Chromium isolation. No auth, host policy, network or real user data is involved.
func TestEarlyFatalClassification(t *testing.T) {
	fatal := "echo \"FATAL:sandbox/linux/suid/client/setuid_sandbox_host.cc:158] Rather than run without sandboxing I'm aborting now.\" >&2\n"
	for _, c := range []struct {
		name, script string
		code         int
		restricted   bool
	}{
		{"sandbox-fatal", fatal + "kill -TRAP $$\n", 133, true},
		{"already-ready", "printf x >&3\n" + fatal + "kill -TRAP $$\n", 133, false},
		{"unrelated-crash", "echo unrelated >&2\nkill -TRAP $$\n", 133, false},
		{"normal-error", fatal + "exit 42\n", 42, false},
		{"normal-exit", "exit 0\n", 0, false},
		{"argv", "test \"$1\" = 'argument with spaces' && test \"$2\" = '--second' || exit 88\nexit 23\n", 23, false},
	} {
		t.Run(c.name, func(t *testing.T) {
			script := filepath.Join(t.TempDir(), "fixture")
			if err := os.WriteFile(script, []byte("#!/bin/sh\nulimit -c 0\n"+c.script), 0700); err != nil {
				t.Fatal(err)
			}
			code, restricted, err := Supervise(script, []string{"argument with spaces", "--second"}, false)
			if err != nil || code != c.code || restricted != c.restricted {
				t.Fatalf("got code=%d restricted=%v error=%v", code, restricted, err)
			}
		})
	}
}
