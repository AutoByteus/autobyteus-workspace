// Package cli translates terminal inputs to the setup boundary. It owns no NFS policy.
package cli

import (
	"bufio"
	"errors"
	"fmt"
	"os"
	"strings"
)

type Terminal struct {
	file    *os.File
	scanner *bufio.Scanner
}

func OpenTerminal() *Terminal {
	f, err := os.OpenFile("/dev/tty", os.O_RDWR, 0)
	if err != nil {
		return &Terminal{}
	}
	scanner := bufio.NewScanner(f)
	scanner.Buffer(make([]byte, 4096), 16384)
	return &Terminal{f, scanner}
}
func (t *Terminal) Close() {
	if t.file != nil {
		t.file.Close()
	}
}
func (t *Terminal) Ask(label, defaultValue string) (string, error) {
	if t.file == nil {
		return "", fmt.Errorf("%s is required: no interactive TTY; pass explicit inputs", label)
	}
	fmt.Fprint(t.file, label)
	if defaultValue != "" {
		fmt.Fprintf(t.file, " [%s]", defaultValue)
	}
	fmt.Fprint(t.file, ": ")
	if !t.scanner.Scan() {
		return "", errors.New("input cancelled or too long")
	}
	value := strings.TrimSpace(t.scanner.Text())
	if value == "" {
		value = defaultValue
	}
	return value, nil
}
func (t *Terminal) Confirm(label string) bool {
	value, err := t.Ask(label+" (type yes)", "no")
	return err == nil && value == "yes"
}
func (t *Terminal) Available() bool { return t.file != nil }
