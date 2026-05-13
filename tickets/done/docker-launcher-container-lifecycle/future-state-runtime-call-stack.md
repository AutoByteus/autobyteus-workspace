# Future-State Runtime Call Stack: Docker launcher lifecycle

Status: Current

## `new-container`

1. `main` / `Invoke-AutoByteusDocker`
2. parse `--image`, `--tag`
3. `assert_docker` / `Assert-Docker`
4. `next_node_name` / `Get-NextNodeName`
   - scan indexed names starting at zero
   - node is unavailable if state exists, managed label exists, or container name exists
5. `start_node` / `Start-Node`
   - pull image
   - choose ports
   - run container with labels and named volumes
   - write state
6. print URLs

## `upgrade --all`

1. parse command and require `--all`
2. assert Docker
3. enumerate managed node names from state and Docker labels
4. capture image IDs for currently existing managed containers
5. for each node name, call single-node reconcile (`start_node` / `Start-Node`)
6. call targeted image cleanup for captured old image IDs

## `destroy --all`

1. parse command and require `--all`
2. assert Docker
3. enumerate managed state entries and managed Docker containers
4. capture current image IDs
5. remove managed containers with force remove
6. delete corresponding state files
7. call targeted image cleanup for captured image IDs
8. print volumes-kept message

## `reset`

1. assert Docker
2. call all-node destroy internals without requiring `--all` at the inner helper level
3. create `autobyteus-server-0` through `new-container` internals

## Image cleanup

1. receive explicit candidate image IDs
2. unique candidate IDs
3. for each candidate:
   - skip blank IDs
   - skip if any Docker container still has `.Image == candidate`
   - run `docker image rm candidate`
   - ignore refusal/failure if Docker still considers image in use
