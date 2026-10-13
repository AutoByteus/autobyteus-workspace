package setup

import (
	"encoding/json"
	"os"
	"strings"
	"testing"

	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/config"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/docker"
)

func TestDeclineNeverChangesResources(t *testing.T) {
	s := Service{} // Any attempted dependency use would panic; denial is first.
	if err := s.Apply(Plan{}, false); err == nil {
		t.Fatal("decline accepted")
	}
	if err := s.Detach(false); err == nil {
		t.Fatal("detach decline accepted")
	}
	if err := s.RecoverPendingNodes(false); err == nil {
		t.Fatal("recovery decline accepted")
	}
}
func TestPendingReceiptDoesNotDuplicatePrivateContainerSnapshot(t *testing.T) {
	p := Plan{Nodes: []docker.Snapshot{{Config: docker.Object{"Env": []string{"SECRET=must-not-duplicate"}}}}}
	b, err := json.Marshal(p)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(b), "SECRET") {
		t.Fatal("private container state escaped per-resource receipt")
	}
}
func TestBackgroundReconnectDoesNotResumePendingNodeMutation(t *testing.T) {
	dir := t.TempDir()
	_ = os.Chmod(dir, 0700)
	store := config.Store{Directory: dir, Owner: uint32(os.Getuid())}
	if err := store.Write("pending-setup.json", Plan{}); err != nil {
		t.Fatal(err)
	}
	s := Service{Store: store}
	if err := s.Reconnect(); err == nil || !strings.Contains(err.Error(), "interactively") {
		t.Fatal(err)
	}
}
