package sealed

import (
	"bytes"
	"crypto/sha256"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"syscall"
	"testing"
)

// Narrow unprivileged custody check, NOT polkit or production-installer acceptance.
func TestSnapshotCustody(t *testing.T) {
	payload, err := os.ReadFile("/usr/bin/true")
	if err != nil {
		t.Fatal(err)
	}
	f, err := Snapshot(bytes.NewReader(payload), fmt.Sprintf("%x", sha256.Sum256(payload)))
	if errors.Is(err, syscall.EINVAL) || errors.Is(err, syscall.ENOSYS) {
		t.Skip("kernel lacks executable memfd flags; enrollment refuses on this kernel")
	}
	if err != nil {
		t.Fatal(err)
	}
	defer f.Close()
	if err = exec.Command(Path(f)).Run(); err != nil {
		t.Fatal(err)
	}
	writable, err := os.OpenFile(Path(f), os.O_WRONLY, 0)
	if err == nil {
		defer writable.Close()
		if _, err = writable.WriteAt([]byte("x"), 0); err == nil {
			t.Fatal("sealed helper remained writable")
		}
	}
	if _, err = Snapshot(bytes.NewReader(payload), fmt.Sprintf("%064x", 0)); err == nil {
		t.Fatal("accepted wrong digest")
	}
}
