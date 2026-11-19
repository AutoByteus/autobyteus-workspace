package launch

import (
	"fmt"
	"io"
	"os"
	"os/exec"
	"os/signal"
	"regexp"
	"sync"
	"sync/atomic"
	"syscall"
	"time"
)

var sandboxFatal = regexp.MustCompile(`FATAL:sandbox/linux/suid/client/setuid_sandbox_host\.cc:[0-9]+\].*Rather than run without sandboxing I'm aborting now\.`)

type diagnostics struct {
	window []byte
	fatal  bool
}

func (d *diagnostics) Write(b []byte) (int, error) {
	// Forward every byte; retain only a bounded matching window.
	n, err := os.Stderr.Write(b)
	for len(b) > 0 {
		count := len(b)
		if count > 2048 {
			count = 2048
		}
		d.window = append(d.window, b[:count]...)
		b = b[count:]
		if sandboxFatal.Match(d.window) {
			d.fatal = true
		}
		if len(d.window) > 4096 {
			d.window = d.window[len(d.window)-4096:]
		}
	}
	return n, err
}

func Supervise(executable string, args []string, managed bool) (int, bool, error) {
	ready, notify, err := os.Pipe()
	if err != nil {
		return 1, false, err
	}
	defer ready.Close()
	cmd := exec.Command(executable, args...)
	cmd.Env = append(os.Environ(), "AUTOBYTEUS_LAUNCH_READY_FD=3")
	cmd.ExtraFiles = []*os.File{notify}
	var receiver, sender *os.File
	if managed {
		receiver, sender, err = restartPair()
		if err == nil {
			defer receiver.Close()
			info, e := sender.Stat()
			if e != nil {
				sender.Close()
				notify.Close()
				return 1, false, e
			}
			cmd.Env = append(cmd.Env, fmt.Sprintf("AUTOBYTEUS_RESTART_INODE=%d", info.Sys().(*syscall.Stat_t).Ino))
			cmd.ExtraFiles = append(cmd.ExtraFiles, sender)
		} else {
			fmt.Fprintln(os.Stderr, "Manual restart channel unavailable:", err)
		}
	}
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	capture := &diagnostics{}
	cmd.Stderr = capture
	started := time.Now()
	signals := make(chan os.Signal, 8)
	signal.Notify(signals, syscall.SIGTERM, syscall.SIGINT, syscall.SIGHUP)
	defer signal.Stop(signals)
	err = cmd.Start()
	if sender != nil {
		sender.Close()
	}
	if err != nil {
		notify.Close()
		return 1, false, err
	}
	notify.Close()
	var terminated atomic.Bool
	done := make(chan struct{})
	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		defer wg.Done()
		for {
			select {
			case s := <-signals:
				terminated.Store(true)
				cmd.Process.Signal(s)
			case <-done:
				return
			}
		}
	}()
	err = cmd.Wait()
	close(done)
	wg.Wait()
	// Readiness pipe may still be inherited by descendants: never block quit waiting for EOF.
	ready.SetReadDeadline(time.Now().Add(20 * time.Millisecond))
	b := make([]byte, 1)
	n, _ := io.ReadFull(ready, b)
	if err == nil {
		return 0, false, nil
	}
	if exit, ok := err.(*exec.ExitError); ok {
		status := exit.Sys().(syscall.WaitStatus)
		code := status.ExitStatus()
		if managed && code == restartExit {
			if receiver == nil || !restartRequested(int(receiver.Fd()), cmd.Process.Pid, os.Getuid()) {
				return 1, false, fmt.Errorf("manual restart not confirmed")
			}
			// Continue collecting signals during revalidation. After Stop, new signals use
			// ordinary process disposition; account for signals already queued before exec.
			e := canonicalRestart(func() bool {
				signal.Stop(signals)
				select {
				case <-signals:
					return false
				default:
					return !terminated.Load()
				}
			})
			return 1, false, e
		}
		if status.Signaled() {
			code = 128 + int(status.Signal())
		}
		return code, n == 0 && time.Since(started) < 10*time.Second && status.Signaled() && status.Signal() == syscall.SIGTRAP && capture.fatal, nil
	}
	return 1, false, err
}
