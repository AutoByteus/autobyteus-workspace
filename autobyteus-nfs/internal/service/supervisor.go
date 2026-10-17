package service

import (
	"context"
	"fmt"
	"io"
	"os"
	"time"

	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/platform"
)

// Supervise owns a single serial administrative reconciliation. A stuck hard-NFS
// call stays outstanding; this is deliberately not an outage watchdog/process pool.
func Supervise(ctx context.Context, privateRoot string, log io.Writer, reconcile func(*os.File) error) error {
	for {
		lock, err := platform.Lock(privateRoot)
		if err == nil {
			err = reconcile(lock)
			lock.Close()
		}
		if err != nil {
			fmt.Fprintf(log, "AutoByteus NFS checking/incomplete: %v\n", err)
		}
		select {
		case <-ctx.Done():
			return nil
		case <-time.After(30 * time.Second):
		}
	}
}
