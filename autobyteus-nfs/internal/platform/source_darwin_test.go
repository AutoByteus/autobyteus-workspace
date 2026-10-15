package platform

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"syscall"
	"testing"

	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/config"
)

type sourceRunner func(string, ...string) ([]byte, error)

func (r sourceRunner) Run(b string, a ...string) ([]byte, error) { return r(b, a...) }

func sourceFixture(t *testing.T) (string, sourceMount) {
	t.Helper()
	p, err := filepath.EvalSymlinks(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	fd, err := syscall.Open(p, syscall.O_RDONLY, 0)
	if err != nil {
		t.Fatal(err)
	}
	_, m, err := sourceDescriptor(fd)
	syscall.Close(fd)
	if err != nil {
		t.Fatal(err)
	}
	return p, m
}
func TestSourceCaptureCorrelationAndClosure(t *testing.T) {
	for _, kind := range []string{"success", "command-error", "bad-plist", "wrong-mapping", "directory-replaced", "symlink-replaced", "ancestor-replaced"} {
		t.Run(kind, func(t *testing.T) {
			base, m := sourceFixture(t)
			p := filepath.Join(base, "source")
			if err := os.Mkdir(p, 0700); err != nil {
				t.Fatal(err)
			}
			original, err := sourcePath(p)
			if err != nil {
				t.Fatal(err)
			}
			fdSeen := -1
			r := sourceRunner(func(b string, a ...string) ([]byte, error) {
				if b != "/usr/sbin/diskutil" || len(a) != 3 || a[0] != "info" || a[1] != "-plist" || a[2] != m.device {
					t.Fatal(b, a)
				}
				for fd := 3; fd < 1024; fd++ {
					var st syscall.Stat_t
					if syscall.Fstat(fd, &st) == nil && st.Ino == original.Inode && uint64(st.Dev) == original.Device {
						fdSeen = fd
						break
					}
				}
				if fdSeen < 0 {
					t.Fatal("directory descriptor not held through command")
				}
				switch kind {
				case "command-error":
					return nil, errors.New("command refused")
				case "bad-plist":
					return []byte("bad"), nil
				case "wrong-mapping":
					return []byte(volumeReply("/dev/disk999", m.path)), nil
				case "directory-replaced", "symlink-replaced":
					if err := os.Rename(p, p+"-original"); err != nil {
						t.Fatal(err)
					}
					if kind == "directory-replaced" {
						err = os.Mkdir(p, 0700)
					} else {
						err = os.Symlink(p+"-original", p)
					}
					if err != nil {
						t.Fatal(err)
					}
				case "ancestor-replaced":
					// The inode remains the same, but the current path gains a symlink ancestor.
					if err := os.Rename(base, base+"-original"); err != nil {
						t.Fatal(err)
					}
					t.Cleanup(func() { os.Remove(base); os.Rename(base+"-original", base) })
					if err := os.Symlink(base+"-original", base); err != nil {
						t.Fatal(err)
					}
				}
				return []byte(volumeReply(m.device, m.path)), nil
			})
			id, err := SourceIdentity(r, p)
			if kind == "success" {
				if err != nil || id.Device != 0 || id.VolumeUUID != strings.ToLower(testVolumeUUID) || id.Inode != original.Inode {
					t.Fatal(id, err)
				}
			} else if err == nil {
				t.Fatal("accepted changed/invalid observation", id)
			}
			var st syscall.Stat_t
			if fdSeen < 0 || syscall.Fstat(fdSeen, &st) != syscall.EBADF {
				t.Fatal("source descriptor leaked", fdSeen)
			}
		})
	}
}
func TestSourceCaptureRefusesSymlinksBeforeCommand(t *testing.T) {
	p, _ := sourceFixture(t)
	if err := os.Mkdir(filepath.Join(p, "child"), 0700); err != nil {
		t.Fatal(err)
	}
	link := p + "-link"
	if err := os.Symlink(p, link); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { os.Remove(link) })
	r := sourceRunner(func(string, ...string) ([]byte, error) { t.Fatal("query before path guard"); return nil, nil })
	for _, path := range []string{link, filepath.Join(link, "child"), p + "-missing"} {
		if _, err := SourceIdentity(r, path); err == nil {
			t.Fatal(path)
		}
	}
}
func TestSourceComparisonUsesVolumeAndInode(t *testing.T) {
	p, m := sourceFixture(t)
	r := sourceRunner(func(string, ...string) ([]byte, error) { return []byte(volumeReply(m.device, m.path)), nil })
	id, err := SourceIdentity(r, p)
	if err != nil {
		t.Fatal(err)
	}
	h := config.HostedFilesystem{InstallationID: strings.ToLower(testVolumeUUID), StorageID: strings.ToLower(testVolumeUUID), Source: p, Identity: id, Backend: "apple", DataUID: 501, DataGID: 20, Allowlist: []string{"192.168.1.0/24"}}
	if err := CheckSource(r, h); err != nil {
		t.Fatal(err)
	}
	for _, variant := range []string{"inode", "uuid", "old-device"} {
		t.Run(variant, func(t *testing.T) {
			other := h
			switch variant {
			case "inode":
				other.Identity.Inode++
			case "uuid":
				other.Identity.VolumeUUID = "b19fe379-be62-4297-9a39-3934cc88214b"
			case "old-device":
				other.Identity = config.Identity{Device: 1, Inode: id.Inode}
			}
			if err := CheckSource(r, other); err == nil {
				t.Fatal("replacement accepted")
			}
			if h.Identity != id {
				t.Fatal("saved identity mutated")
			}
		})
	}
}
func TestSourceIdentityInstalledDiskutil(t *testing.T) {
	// Narrow read-only system-command integration on our directory; no mount/export.
	p, _ := sourceFixture(t)
	id, err := SourceIdentity(Commands{}, p)
	if err != nil {
		t.Fatal(err)
	}
	if id.Device != 0 || id.Inode == 0 || !config.ValidVolumeUUID(id.VolumeUUID) {
		t.Fatal(id)
	}
}

func TestSourceCapturePermissionRefusal(t *testing.T) {
	if os.Getuid() == 0 {
		t.Skip("nonroot permission check")
	}
	p, _ := sourceFixture(t)
	if err := os.Chmod(p, 0000); err != nil {
		t.Fatal(err)
	}
	defer os.Chmod(p, 0700)
	r := sourceRunner(func(string, ...string) ([]byte, error) { t.Fatal("unreadable directory queried"); return nil, nil })
	if _, err := SourceIdentity(r, p); err == nil {
		t.Fatal("unreadable source accepted")
	}
}
