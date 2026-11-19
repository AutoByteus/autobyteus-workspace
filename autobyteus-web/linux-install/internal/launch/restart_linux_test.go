package launch

import (
	"os"
	"os/exec"
	"syscall"
	"testing"
)

// Real socket sends/credentials; no protected target or OS installation.
func TestDirectChildHandback(t *testing.T) {
	for _, tc := range []struct {
		name, cmd string
		expected  bool
	}{
		{"direct", "printf R >&4; exit 76", true},
		{"no-indication", "exit 76", false}, {"different-byte", "printf X >&4;exit 76", false},
		{"long", "printf RRR >&4;exit 76", false},
		{"duplicate", "printf R >&4; printf R >&4; exit 76", false},
		{"grandchild", "/bin/sh -c 'printf R >&4'; exit 76", false},
		{"ordinary-exit", "printf R >&4;exit 0", false}, {"crash", "printf R >&4;kill -TERM $$", false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			r, w, e := restartPair()
			if e != nil {
				t.Fatal(e)
			}
			defer r.Close()
			tmp, e := os.Open("/dev/null")
			if e != nil {
				t.Fatal(e)
			}
			defer tmp.Close()
			c := exec.Command("/bin/sh", "-c", tc.cmd)
			c.ExtraFiles = []*os.File{tmp, w}
			if e = c.Start(); e != nil {
				t.Fatal(e)
			}
			w.Close()
			_ = c.Wait()
			got := c.ProcessState.ExitCode() == restartExit && restartRequested(int(r.Fd()), c.Process.Pid, os.Getuid())
			if got != tc.expected {
				t.Fatal("unexpected restart decision", got)
			}
		})
	}
}
func TestHandbackRejectsAncillaryAndWrongUID(t *testing.T) {
	for _, rights := range []bool{false, true} {
		r, w, e := restartPair()
		if e != nil {
			t.Fatal(e)
		}
		uid := os.Getuid() + 1
		var control []byte
		if rights {
			uid = os.Getuid()
			control = syscall.UnixRights(1)
		}
		e = syscall.Sendmsg(int(w.Fd()), []byte{'R'}, control, nil, 0)
		if e != nil {
			t.Fatal(e)
		}
		if restartRequested(int(r.Fd()), os.Getpid(), uid) {
			t.Fatal("accepted invalid credentials or extra descriptor")
		}
		w.Close()
		r.Close()
	}
}

func TestEmptyDatagramIsNotCompletion(t *testing.T) {
	r, w, err := restartPair()
	if err != nil {
		t.Fatal(err)
	}
	defer r.Close()
	defer w.Close()
	if err := syscall.Sendto(int(w.Fd()), nil, 0, nil); err != nil {
		t.Fatal(err)
	}
	if restartRequested(int(r.Fd()), os.Getpid(), os.Getuid()) {
		t.Fatal("empty indication accepted")
	}
}
