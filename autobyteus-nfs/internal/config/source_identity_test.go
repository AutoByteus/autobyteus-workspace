package config

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestSourceBindingVariants(t *testing.T) {
	uuid := "a19fe379-be62-4297-9a39-3934cc88214b"
	h := HostedFilesystem{InstallationID: uuid, StorageID: uuid, Source: "/Users/test/project", Backend: "apple", DataUID: 501, DataGID: 20, Allowlist: []string{"192.168.1.0/24"}}
	cases := []struct {
		name, backend string
		id            Identity
		valid         bool
	}{
		{"apple", "apple", Identity{VolumeUUID: uuid, Inode: 2}, true},
		{"linux-native", "ganesha-native", Identity{Device: 1, Inode: 2}, true},
		{"linux-docker", "ganesha-docker", Identity{Device: 1, Inode: 2}, true},
		{"unbound", "apple", Identity{}, false},
		{"old-apple", "apple", Identity{Device: 1, Inode: 2}, false},
		{"mixed", "apple", Identity{Device: 1, VolumeUUID: uuid, Inode: 2}, false},
		{"zero-inode", "apple", Identity{VolumeUUID: uuid}, false},
		{"zero-uuid", "apple", Identity{VolumeUUID: "00000000-0000-0000-0000-000000000000", Inode: 2}, false},
		{"uppercase", "apple", Identity{VolumeUUID: strings.ToUpper(uuid), Inode: 2}, false},
		{"invalid-uuid", "apple", Identity{VolumeUUID: "garbage", Inode: 2}, false},
		{"linux-uuid", "ganesha-native", Identity{Device: 1, VolumeUUID: uuid, Inode: 2}, false},
		{"linux-zero-device", "ganesha-native", Identity{Inode: 2}, false},
		{"linux-zero-inode", "ganesha-native", Identity{Device: 1}, false},
		{"unsupported", "unknown", Identity{Device: 1, Inode: 2}, false},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			h.Backend = c.backend
			h.Identity = c.id
			if got := h.ValidateBound() == nil; got != c.valid {
				t.Fatalf("valid=%v: %v", got, h.ValidateBound())
			}
			b, err := json.Marshal(h)
			if err != nil {
				t.Fatal(err)
			}
			var round HostedFilesystem
			if err = Decode(b, &round); err != nil || round.Identity != h.Identity {
				t.Fatal(string(b), err)
			}
			if c.valid && c.backend == "apple" && strings.Contains(string(b), `"device"`) {
				t.Fatal(string(b))
			}
			if c.valid && c.backend != "apple" && strings.Contains(string(b), `"volumeUuid"`) {
				t.Fatal(string(b))
			}
		})
	}
	h.Backend = "apple"
	h.Identity = Identity{}
	if err := h.Validate(); err != nil {
		t.Fatal("new plan metadata", err)
	}
	for _, s := range []string{`{"volumeUuid":3}`, `{"inode":"2"}`, `{"device":-1}`} {
		var id Identity
		if json.Unmarshal([]byte(s), &id) == nil {
			t.Fatal("wrong type accepted", s)
		}
	}
}
