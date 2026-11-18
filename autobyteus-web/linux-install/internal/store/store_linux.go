// Package store owns admission, the single pending image, and durable activation.
package store

import (
	"crypto/ed25519"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"syscall"

	"autobyteus.local/desktop/linux-install/internal/imagefile"
	"autobyteus.local/desktop/linux-install/internal/protocol"
	"autobyteus.local/desktop/linux-install/internal/release"
)

type pending struct {
	id, file, baseline, channel string
}

var ErrStageGone = errors.New("verified stage is no longer present")

// The service serializes all calls. Directory is fixed by its root-owned service instance.
type Store struct {
	directory string
	arch      string
	key       ed25519.PublicKey
	stage     *pending
	lock      *os.File
}

func Open(directory, arch string, key ed25519.PublicKey) (*Store, error) {
	lock, err := os.OpenFile(filepath.Join(directory, ".writer-lock"), os.O_CREATE|os.O_RDWR|syscall.O_NOFOLLOW, 0600)
	if err != nil {
		return nil, err
	}
	if err = syscall.Flock(int(lock.Fd()), syscall.LOCK_EX|syscall.LOCK_NB); err != nil {
		lock.Close()
		return nil, err
	}
	s := &Store{directory: directory, arch: arch, key: key, lock: lock}
	if _, _, err = s.current(); err != nil {
		s.Close()
		return nil, fmt.Errorf("installed image requires repair: %w", err)
	}
	entries, err := os.ReadDir(directory)
	if err != nil {
		s.Close()
		return nil, err
	}
	for _, e := range entries {
		if len(e.Name()) > len(".pending-") && e.Name()[:len(".pending-")] == ".pending-" {
			if err = os.Remove(filepath.Join(directory, e.Name())); err != nil {
				s.Close()
				return nil, err
			}
		}
	}
	return s, nil
}

func (s *Store) Close() error { return s.lock.Close() }
func (s *Store) live() string { return filepath.Join(s.directory, "AutoByteus.AppImage") }
func (s *Store) current() (release.Record, protocol.Response, error) {
	f, err := imagefile.Open(s.live())
	if err != nil {
		return release.Record{}, protocol.Response{}, err
	}
	defer f.Close()
	r, data, signature, err := imagefile.Identity(f, s.key, s.arch)
	return r, protocol.Response{Record: data, Signature: signature}, err
}

func (s *Store) Handle(request protocol.Request, payload io.Reader) (protocol.Response, error) {
	switch request.Operation {
	case "status":
		_, response, err := s.current()
		return response, err
	case "stage":
		return s.receive(request, payload)
	case "activate":
		return s.activate(request)
	case "discard":
		if s.stage != nil && s.stage.id == request.StageID {
			return protocol.Response{}, s.discard()
		}
		return protocol.Response{}, nil
	default:
		return protocol.Response{}, fmt.Errorf("unknown writer operation")
	}
}

func (s *Store) discard() error {
	if s.stage == nil {
		return nil
	}
	if err := os.Remove(s.stage.file); err != nil && !os.IsNotExist(err) {
		return err
	}
	s.stage = nil
	return nil
}

func (s *Store) receive(q protocol.Request, in io.Reader) (protocol.Response, error) {
	r, err := release.Verify(q.Record, q.Signature, s.key, s.arch)
	if err != nil {
		return protocol.Response{}, err
	}
	current, _, err := s.current()
	if err != nil {
		return protocol.Response{}, err
	}
	if current.SHA256 != q.ExpectedDigest {
		return protocol.Response{}, fmt.Errorf("installed identity changed")
	}
	if err = release.Admit(r, current, q.Channel); err != nil {
		return protocol.Response{}, err
	}
	// At most one pending image, including while a replacement candidate is received.
	if err = s.discard(); err != nil {
		return protocol.Response{}, err
	}
	var space syscall.Statfs_t
	if err = syscall.Statfs(s.directory, &space); err != nil {
		return protocol.Response{}, err
	}
	if space.Bavail*uint64(space.Bsize) < uint64(r.Size)+16*1024*1024 {
		return protocol.Response{}, fmt.Errorf("insufficient staging space")
	}
	f, err := os.CreateTemp(s.directory, ".pending-")
	if err != nil {
		return protocol.Response{}, err
	}
	committed := false
	defer func() {
		f.Close()
		if !committed {
			os.Remove(f.Name())
		}
	}()
	if err = r.Copy(f, in); err != nil {
		return protocol.Response{}, err
	}
	if err = imagefile.SetIdentity(f, q.Record, q.Signature); err != nil {
		return protocol.Response{}, err
	}
	if _, _, _, err = imagefile.Identity(f, s.key, s.arch); err != nil {
		return protocol.Response{}, err
	}
	if err = f.Chmod(0555); err != nil {
		return protocol.Response{}, err
	}
	if err = f.Sync(); err != nil {
		return protocol.Response{}, err
	}
	if err = imagefile.SyncDirectory(s.directory); err != nil {
		return protocol.Response{}, err
	}
	var nonce [32]byte
	if _, err = rand.Read(nonce[:]); err != nil {
		return protocol.Response{}, err
	}
	s.stage = &pending{hex.EncodeToString(nonce[:]), f.Name(), current.SHA256, q.Channel}
	committed = true
	return protocol.Response{StageID: s.stage.id, Record: q.Record, Signature: q.Signature, ExpectedDigest: current.SHA256}, nil
}

func (s *Store) activate(q protocol.Request) (protocol.Response, error) {
	p := s.stage
	if (q.Channel != "stable" && q.Channel != "beta") || (p != nil && (p.channel != q.Channel || p.baseline != q.ExpectedDigest)) {
		return protocol.Response{}, fmt.Errorf("stale activation request")
	}
	if p == nil || p.id != q.StageID {
		return protocol.Response{}, ErrStageGone
	}
	current, _, err := s.current()
	if err != nil {
		return protocol.Response{}, err
	}
	if current.SHA256 != p.baseline {
		return protocol.Response{}, fmt.Errorf("installed identity changed")
	}
	f, err := imagefile.Open(p.file)
	if err != nil {
		return protocol.Response{}, err
	}
	defer f.Close()
	candidate, data, signature, err := imagefile.Identity(f, s.key, s.arch)
	if err != nil {
		return protocol.Response{}, err
	}
	if err = release.Admit(candidate, current, q.Channel); err != nil {
		return protocol.Response{}, err
	}
	if err = os.Rename(p.file, s.live()); err != nil {
		return protocol.Response{}, err
	}
	s.stage = nil
	if err = imagefile.SyncDirectory(s.directory); err != nil {
		return protocol.Response{}, err
	}
	return protocol.Response{Record: data, Signature: signature}, nil
}
