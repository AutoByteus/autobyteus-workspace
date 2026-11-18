package launch

import (
	"bufio"
	"context"
	"fmt"
	"os"
	"os/exec"
	"strings"
	"time"
)

func graphical() bool { return os.Getenv("DISPLAY") != "" || os.Getenv("WAYLAND_DISPLAY") != "" }

func Consent(destination, authorizationPath string) error {
	message := "Ubuntu restricts this portable application's sandbox. Install the authenticated AutoByteus release at " + destination + " with an app-scoped permission? Initial setup needs the official release service and one Ubuntu administrator authorization. Other applications and your data are unchanged. Ubuntu will identify the authorized program as " + authorizationPath + " (a program path, not publisher verification)."
	if graphical() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
		defer cancel()
		cmd := exec.CommandContext(ctx, "/usr/bin/zenity", "--question", "--title=Install AutoByteus", "--text="+message, "--ok-label=Install", "--cancel-label=Cancel")
		if err := cmd.Run(); err != nil {
			return fmt.Errorf("installation cancelled or dialog unavailable; open the AppImage from a terminal to retry")
		}
		return nil
	}
	tty, err := os.OpenFile("/dev/tty", os.O_RDWR, 0)
	if err != nil {
		return fmt.Errorf("interactive Ubuntu authorization required; open from your desktop or terminal")
	}
	defer tty.Close()
	fmt.Fprintln(tty, message+"\nType Install to continue, anything else cancels:")
	reader := bufio.NewReaderSize(tty, 128)
	line, err := reader.ReadSlice('\n')
	if err != nil || strings.TrimSpace(string(line)) != "Install" {
		return fmt.Errorf("installation cancelled")
	}
	return nil
}

func Explain(message string) {
	fmt.Fprintln(os.Stderr, message)
	if os.Geteuid() != 0 && graphical() {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
		defer cancel()
		exec.CommandContext(ctx, "/usr/bin/zenity", "--error", "--title=AutoByteus installation", "--text="+message).Run()
	}
}
