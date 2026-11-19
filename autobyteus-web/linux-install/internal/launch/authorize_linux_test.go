package launch

import (
	"strings"
	"testing"

	"autobyteus.local/desktop/linux-install/internal/protocol"
)

func TestAuthorizationFailureGuidance(t *testing.T) {
	for _, tc := range []struct {
		operation     string
		code          int
		cause, action string
	}{
		{"provision", protocol.ExitInsufficientInstallSpace, "install volume", "Make room"},
		{"provision", 126, "cancelled", "Retry the requested action"},
		{"provision", 127, "could not authorize or start", "administrator"},
		{"provision", 1, "could not complete", "administrator"},
		{"provision", -1, "could not complete", "administrator"},
		{"uninstall", protocol.ExitInsufficientInstallSpace, "could not complete", "administrator"},
	} {
		msg := authorizationFailure(tc.operation, tc.code).Error()
		if !strings.Contains(msg, tc.cause) || !strings.Contains(msg, tc.action) || len(msg) > 300 {
			t.Errorf("%s/status %d: %s", tc.operation, tc.code, msg)
		}
		if strings.Contains(msg, "install volume") != (tc.operation == "provision" && tc.code == protocol.ExitInsufficientInstallSpace) {
			t.Errorf("ambiguous failure mislabeled: %s", msg)
		}
	}
}
