package setup

import (
	"errors"
	"fmt"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/config"
	"github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/docker"
	"os"
	"path/filepath"
)

func (s *Service) detachNodes(a config.Attachment) error {
	for _, node := range a.Nodes {
		if err := s.Docker.ReapProbe(s.Store, node); err != nil {
			return err
		}
		receipt, receiptErr := docker.ReadReceipt(s.Store, node)
		if receiptErr != nil && !os.IsNotExist(receiptErr) {
			return receiptErr
		}
		if receiptErr == nil && !receipt.Complete {
			if receipt.Attachment.StorageID != a.StorageID {
				return errors.New("node receipt belongs to different storage")
			}
			if err := s.Docker.Recover(receipt, docker.ReceiptFile(s.Store, node)); err != nil {
				return err
			}
			receipt, receiptErr = docker.ReadReceipt(s.Store, node)
			if receiptErr != nil {
				return receiptErr
			}
		}
		public := config.Store{Directory: filepath.Join(s.Public.Directory, "nodes"), Owner: s.Public.Owner, Public: true}
		var ref config.NodeAttachment
		err := public.Read(node+".json", &ref)
		published := err == nil
		if os.IsNotExist(err) {
			// Apply may have recreated successfully immediately before publication failed.
			if receiptErr != nil || receipt.Attachment.StorageID != a.StorageID || receipt.Replacement == "" || receipt.Detach {
				continue
			}
			ref = receipt.Attachment
		} else if err != nil {
			return err
		}
		if ref.StorageID != a.StorageID || ref.MountRoot != a.MountRoot || ref.Node != node {
			return errors.New("node reference differs from intended attachment")
		}
		if err = s.Docker.CheckDaemon(ref); err != nil {
			return err
		}
		available, err := s.Docker.Discover()
		if err != nil {
			return err
		}
		found := false
		for _, selected := range available {
			if selected.Node() != node {
				continue
			}
			found = true
			if selected.Attached(ref) {
				if err = s.Docker.Recreate(selected, ref, true, docker.ReceiptFile(s.Store, node), func(id string) error { return s.Docker.VerifyStarted(id, a.MountRoot, false) }); err != nil {
					return err
				}
			} else if receiptErr != nil || !receipt.Complete || !receipt.Detach || receipt.Replacement != selected.ID {
				return errors.New("selected node attachment changed externally; refusing detach")
			}
			if published {
				if err = public.Remove(node + ".json"); err != nil {
					return err
				}
			}
			break
		}
		if !found {
			return fmt.Errorf("selected node %s is missing; detach incomplete", node)
		}
	}
	return nil
}
