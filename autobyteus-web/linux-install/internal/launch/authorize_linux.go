package launch

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"strconv"
	"time"

	"autobyteus.local/desktop/linux-install/internal/protocol"
)

func ttyAgent() (func(), error) {
	tty, err := os.OpenFile("/dev/tty", os.O_RDWR, 0)
	if err != nil {
		return nil, fmt.Errorf("no interactive authentication agent")
	}
	ready, notify, err := os.Pipe()
	if err != nil {
		tty.Close()
		return nil, err
	}
	cmd := exec.Command("/usr/bin/pkttyagent", "--process", strconv.Itoa(os.Getpid()), "--notify-fd", "3")
	cmd.Stdin = tty
	cmd.Stdout = tty
	cmd.Stderr = tty
	cmd.ExtraFiles = []*os.File{notify}
	if err = cmd.Start(); err != nil {
		tty.Close()
		ready.Close()
		notify.Close()
		return nil, err
	}
	notify.Close()
	cleanup := func() { cmd.Process.Kill(); cmd.Wait(); tty.Close(); ready.Close() }
	// pkttyagent closes notify-fd only once the normal system agent is registered.
	ready.SetReadDeadline(time.Now().Add(20 * time.Second))
	var b [1]byte
	if _, err = ready.Read(b[:]); err != io.EOF {
		cleanup()
		return nil, fmt.Errorf("Ubuntu authentication agent did not become ready")
	}
	return cleanup, nil
}

// executable is either the retained parent's sealed descriptor or the root-owned installed provisioner.
func Authorize(executable string, q protocol.Request, image io.Reader) error {
	if !graphical() {
		cleanup, err := ttyAgent()
		if err != nil {
			return err
		}
		defer cleanup()
	}
	fmt.Fprintln(os.Stderr, "Ubuntu will request one-shot authorization for", executable, "(program path, not a publisher verification).")
	header, err := json.Marshal(q)
	if err != nil {
		return err
	}
	header = append(header, '\n')
	cmd := exec.Command("/usr/bin/pkexec", "--disable-internal-agent", executable)
	cmd.Stdin = io.MultiReader(bytes.NewReader(header), image)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err = cmd.Run(); err != nil {
		fmt.Fprintln(os.Stderr, "pkexec:", err)
		code := -1
		var exit *exec.ExitError
		if errors.As(err, &exit) {
			code = exit.ExitCode()
		}
		return authorizationFailure(q.Operation, code)
	}
	return nil
}

// Never copy helper stdout/stderr, subprocess error strings or payloads into the dialog.
func authorizationFailure(operation string, code int) error {
	switch code {
	case protocol.ExitInsufficientInstallSpace:
		if operation == "provision" {
			return errors.New("Not enough free space on the AutoByteus install volume. Make room on the volume containing /opt/autobyteus-desktop, or ask an Ubuntu administrator for help, then try again.")
		}
	case 126:
		return errors.New("Ubuntu authorization was cancelled. Retry the requested action when you are ready to authorize it.")
	case 127:
		return errors.New("Ubuntu could not authorize or start this operation. Ask an Ubuntu administrator to check authorization and try again.")
	}
	return errors.New("AutoByteus could not complete the requested operation. Ask an Ubuntu administrator to inspect the installation and its terminal diagnostics before trying again.")
}
