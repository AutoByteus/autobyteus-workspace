# Primary dependency contracts — CRR008

Approved intended behavior comes from the local requirements, not these sources.
The independently supported trigger is an ordinary host reboot after successful
selected-client setup, with storage/network subsequently healthy.

- [Docker restart-policy documentation](https://docs.docker.com/engine/containers/start-containers-automatically/)
  distinguishes restart policies and respects intentionally stopped containers;
  policy application depends on successful startup. It is not a guarantee of
  cross-container NFS readiness ordering. It also cautions against competing
  process managers. This reinforces preservation/ownership constraints rather
  than prescribing another supervisor.
- [Moby docker-v29.1.3 daemon restore](https://github.com/moby/moby/blob/docker-v29.1.3/daemon/daemon.go#L605-L642):
  restore starts restart-eligible containers in separate tasks; the failed
  containerStart call is logged, then that task completes. This path has no
  storage-ready retry. Its dependency wait is for Docker links/network
  dependencies, not this NFS local-volume export. The actual API journal records
  the failed-start call before Ganesha starts and daemon startup completes.
- [Moby docker-v29.1.3 container start](https://github.com/moby/moby/blob/docker-v29.1.3/daemon/start.go#L154-L157):
  volume setup errors return before process creation. An application entrypoint
  wait cannot repair a failure that prevents its process from starting.

Upstream source interpretation is supporting inference, not a claim that Ubuntu's
Docker build equals the tag byte-for-byte or that Docker is violating its own
contract. The product's reviewed dependency/lifecycle integration is inadequate
for the observed supported path. Two actual normal reboot journals plus current
product source establish the finding independently of generic dependency lore.
Fetch metadata and corrected initial lookup errors: `primary-contracts-fetch.json`.
