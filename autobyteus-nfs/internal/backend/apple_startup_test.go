package backend

import (
	"errors"
	"reflect"
	"strings"
	"testing"
	"time"
)

const rpcHeader = "   program vers proto   port\n"
const servingPorts = rpcHeader + "100003 3 tcp 2049 nfs\n100005 3 tcp 20048 mountd\n"

type appleStartupRunner struct {
	t     *testing.T
	calls []string
	run   func(string, []string) ([]byte, error)
}

func (r *appleStartupRunner) Run(binary string, args ...string) ([]byte, error) {
	r.t.Helper()
	r.calls = append(r.calls, binary+" "+strings.Join(args, " "))
	if binary == "/usr/sbin/rpcinfo" {
		if len(args) == 4 {
			if !reflect.DeepEqual(args, []string{"--timeout", "2", "-p", "192.168.1.5"}) {
				r.t.Fatal(args)
			}
		} else if len(args) != 8 || !reflect.DeepEqual(args[:3], []string{"--timeout", "2", "-n"}) || args[4] != "-t" || args[5] != "192.168.1.5" || args[7] != "3" || (args[6] == "100003" && args[3] != "2049") || (args[6] == "100005" && args[3] != "20048") {
			r.t.Fatalf("implicit lookup or wrong endpoint/protocol: %v", args)
		}
	}
	return r.run(binary, args)
}
func readyAppleRPC(binary string, args []string) ([]byte, error) {
	if binary == "/usr/sbin/rpcinfo" && args[2] == "-p" {
		return []byte(servingPorts), nil
	}
	return nil, nil
}
func TestAppleActivationWaitsForBothServingPrograms(t *testing.T) {
	for _, ownsSettings := range []bool{true, false} {
		t.Run(map[bool]string{true: "restart", false: "update"}[ownsSettings], func(t *testing.T) {
			r := &appleStartupRunner{t: t, run: readyAppleRPC}
			if err := activateApple(r, ownsSettings, "192.168.1.5"); err != nil {
				t.Fatal(err)
			}
			action := "update"
			if ownsSettings {
				action = "restart"
			}
			want := []string{"/sbin/nfsd checkexports", "/sbin/nfsd enable", "/sbin/nfsd " + action,
				"/usr/sbin/rpcinfo --timeout 2 -p 192.168.1.5",
				"/usr/sbin/rpcinfo --timeout 2 -n 2049 -t 192.168.1.5 100003 3",
				"/usr/sbin/rpcinfo --timeout 2 -n 20048 -t 192.168.1.5 100005 3"}
			if !reflect.DeepEqual(r.calls, want) {
				t.Fatalf("command completion/list alone is not readiness: %v", r.calls)
			}
		})
	}
}
func TestAppleColdRPCStartupRechecksNFSAndMountWithoutReactivation(t *testing.T) {
	// Registration absence and serving transitions model the observed startup,
	// not a mount-error retry. Both registered programs must answer at their ports.
	now := time.Unix(0, 0)
	stage := 0
	failure := errors.New("not yet serving")
	r := &appleStartupRunner{t: t}
	r.run = func(binary string, args []string) ([]byte, error) {
		if binary != "/usr/sbin/rpcinfo" {
			t.Fatalf("reactivation/mount in observation: %s", binary)
		}
		if args[2] == "-p" {
			switch stage {
			case 0:
				return []byte("RPC: Remote system error - Connection refused"), failure
			case 1:
				return []byte("RPC: Timed out"), failure
			case 2:
				return []byte(rpcHeader + "100003 3 udp 2049 nfs\n100005 1 tcp 20048 mountd\n"), nil
			case 3:
				return []byte(rpcHeader + "100003 3 tcp 2049 nfs\n"), nil
			}
			return []byte(servingPorts), nil
		}
		if stage == 4 {
			return []byte("RPC: Unable to send; errno = Broken pipe"), failure
		}
		if stage == 5 && args[6] == "100005" {
			return []byte("RPC: Program not registered"), failure
		}
		return nil, nil
	}
	err := appleRPCStartup(r, "192.168.1.5", func() time.Time { return now }, func(d time.Duration) { stage++; now = now.Add(d) })
	if err != nil || stage != 6 || len(r.calls) != 12 {
		t.Fatal(err, stage, r.calls)
	}
	wantLast := []string{"/usr/sbin/rpcinfo --timeout 2 -p 192.168.1.5", "/usr/sbin/rpcinfo --timeout 2 -n 2049 -t 192.168.1.5 100003 3", "/usr/sbin/rpcinfo --timeout 2 -n 20048 -t 192.168.1.5 100005 3"}
	if !reflect.DeepEqual(r.calls[len(r.calls)-3:], wantLast) {
		t.Fatal(r.calls)
	}
}
func TestAppleStartupDoesNotMaskInvalidSetupOrExecution(t *testing.T) {
	for _, failCommand := range []string{"checkexports", "enable", "restart", "update"} {
		t.Run(failCommand, func(t *testing.T) {
			failure := errors.New("invalid setup")
			r := &appleStartupRunner{t: t, run: func(binary string, args []string) ([]byte, error) {
				if binary != "/sbin/nfsd" {
					t.Fatal("RPC after failed activation")
				}
				if args[0] == failCommand {
					return nil, failure
				}
				return nil, nil
			}}
			if err := activateApple(r, failCommand != "update", "192.168.1.5"); !errors.Is(err, failure) {
				t.Fatal(err)
			}
		})
	}
	for _, output := range []string{"", "RPC: Authentication error", "RPC: Program/version mismatch", "RPC: Procedure unavailable", "RPC: Unknown host", "Permission denied", "unrecognized option", "RPC: Unable to receive"} {
		for _, atNull := range []bool{false, true} {
			t.Run(output+map[bool]string{true: "/NULL", false: "/registration"}[atNull], func(t *testing.T) {
				failure := errors.New("permanent/unknown RPC failure")
				r := &appleStartupRunner{t: t, run: func(binary string, args []string) ([]byte, error) {
					if atNull && args[2] == "-p" {
						return []byte(servingPorts), nil
					}
					return []byte(output), failure
				}}
				err := appleRPCStartup(r, "192.168.1.5", time.Now, func(time.Duration) { t.Fatal("retried invalid/unknown setup") })
				if !errors.Is(err, failure) {
					t.Fatal("lost original failure", err)
				}
			})
		}
	}
}
func TestAppleStartupStopsObservingUnavailablePrograms(t *testing.T) {
	for _, output := range []string{"RPC: Program not registered", "RPC: Remote system error - Connection refused", "RPC: Timed out", "RPC: Unable to send; errno = Broken pipe", rpcHeader} {
		t.Run(output, func(t *testing.T) {
			now := time.Unix(0, 0)
			failure := errors.New(output)
			r := &appleStartupRunner{t: t, run: func(string, []string) ([]byte, error) {
				if output == rpcHeader {
					return []byte(output), nil
				}
				return []byte(output), failure
			}}
			err := appleRPCStartup(r, "192.168.1.5", func() time.Time { return now }, func(d time.Duration) { now = now.Add(d) })
			if err == nil || !strings.Contains(err.Error(), "setup remains incomplete") || len(r.calls) != 121 {
				t.Fatal(err, len(r.calls))
			}
			if output != rpcHeader && !errors.Is(err, failure) {
				t.Fatal("lost original failure", err)
			}
		})
	}
}
func TestAppleRPCRegistrationParsing(t *testing.T) {
	for _, invalid := range []string{"", "unrecognized", rpcHeader + "bad", rpcHeader + "100003 3 tcp zero", rpcHeader + "100003 3 tcp 0", rpcHeader + "100003 3 tcp 65536", servingPorts + "100003 3 tcp 2049"} {
		if _, err := appleTCPPorts(invalid); err == nil {
			t.Fatal("accepted invalid registration", invalid)
		}
	}
	ports, err := appleTCPPorts(rpcHeader + "100000 4 tcp 111 rpcbind\n100003 2 tcp 2049\n100003 3 udp 2049\n100003 3 tcp 2049\n100005 3 tcp 20048\n")
	if err != nil || ports != [2]string{"2049", "20048"} {
		t.Fatal(ports, err)
	}
}
