package main

import (
	"errors"
	"fmt"
	"testing"

	"autobyteus.local/desktop/linux-install/internal/install"
	"autobyteus.local/desktop/linux-install/internal/protocol"
)

func TestKnownInstallVolumeFailureStatus(t *testing.T) {
	if got := failureStatus(fmt.Errorf("preflight: %w", install.ErrInsufficientInstallSpace)); got != protocol.ExitInsufficientInstallSpace {
		t.Fatalf("known preflight status=%d", got)
	}
	// A subprocess or an unrelated operation can mention space; text is not authority.
	if got := failureStatus(errors.New(install.ErrInsufficientInstallSpace.Error())); got != 1 {
		t.Fatalf("unclassified failure status=%d", got)
	}
}
