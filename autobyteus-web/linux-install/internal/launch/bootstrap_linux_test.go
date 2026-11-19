package launch

import (
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"syscall"
	"testing"
)

// Exercise the fixed-descriptor claim with a real Node process, the release Node-API
// headers and the same Linux sockets used by Supervise. No install or user data.
func TestBootstrapClaim(t *testing.T) {
	node, err := exec.LookPath("node")
	if err != nil {
		t.Skip("requires the native packaging Node toolchain")
	}
	node, err = filepath.EvalSymlinks(node)
	if err != nil {
		t.Fatal(err)
	}
	cc, err := exec.LookPath("gcc")
	if err != nil {
		t.Skip("requires the native packaging C compiler")
	}
	module := filepath.Join(t.TempDir(), "claim.node")
	include := filepath.Join(filepath.Dir(node), "../include/node")
	cmd := exec.Command(cc, "-std=c11", "-Wall", "-Werror", "-fPIC", "-shared", "-I"+include,
		"../../electron/managed_restart.c", "-o", module)
	if output, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("%v: %s", err, output)
	}
	for _, mode := range []string{"channel", "wrong-identification", "no-identification", "blocking", "collision"} {
		t.Run(mode, func(t *testing.T) {
			null, err := os.Open("/dev/null")
			if err != nil {
				t.Fatal(err)
			}
			defer null.Close()
			r, w, err := restartPair()
			if err != nil {
				t.Fatal(err)
			}
			defer r.Close()
			defer w.Close()
			sender := w
			switch mode {
			case "wrong-identification", "no-identification":
				var buf [1]byte
				if _, _, err := syscall.Recvfrom(int(w.Fd()), buf[:], syscall.MSG_DONTWAIT); err != nil {
					t.Fatal(err)
				}
				if mode == "wrong-identification" {
					if err := syscall.Sendto(int(r.Fd()), []byte{'X'}, 0, nil); err != nil {
						t.Fatal(err)
					}
				}
			case "blocking":
				if err := syscall.SetNonblock(int(w.Fd()), false); err != nil {
					t.Fatal(err)
				}
			case "collision":
				sender = null
			}
			test := `const [file, expected] = process.argv.slice(1), fs = require('node:fs');
const ok = require(file)();
if (ok !== (expected === 'true')) process.exit(1);
if (ok) {
  const flags = /^flags:\s+([0-7]+)/m.exec(fs.readFileSync('/proc/self/fdinfo/4','utf8'))[1];
  if (!(parseInt(flags,8) & 0o2000000)) process.exit(2);
  fs.writeSync(4,'R'); fs.closeSync(4);
}`
			c := exec.Command(node, "-e", test, module, strconv.FormatBool(mode == "channel"))
			c.ExtraFiles = []*os.File{null, sender}
			if out, e := c.CombinedOutput(); e != nil {
				t.Fatalf("%v: %s", e, out)
			}
			if restartRequested(int(r.Fd()), c.Process.Pid, os.Getuid()) != (mode == "channel") {
				t.Fatal("unexpected indication")
			}
		})
	}
}
