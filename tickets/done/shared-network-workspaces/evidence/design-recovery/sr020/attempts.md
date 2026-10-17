# SR020 experiment attempts

Attempt1: fresh VM preparation/source retrieval/patch succeeded; Debian build did not start because the designer harness omitted fakeroot (apt recommends are disabled). Not an engine/product failure. dch also warned about missing distro-info Perl package. No public create or patched engine run. Exact VM/private root cleaned. All raw output and original script retained in attempt-1/.

Attempt2: same source/patch/config/kernel/client, adds only build-harness fakeroot/libdistro-info-perl dependencies. New owned VM. No production change or client tuning. Build/package install and public create passed (1.207s, hostReady true) under defaultY, hard4.1, same source inode/bytes/UUID and active jobs. Subsequent harness assertion wrongly expected UUID only twice in a combined output that also contained the mount source (three valid occurrences). This stopped before operation/reconnect checks; not a product failure. Exact VM/root cleaned; raw valid create/preservation receipts retained in attempt-2/.

Attempt3: correct only the harness UUID assertion to parse the two marker JSON lines, rather than count the UUID in unrelated mount output. Same public path/source/patch/package/kernel/defaultY, new owned VM. Retain overall Attempt2 Incomplete.

Attempt3 completed: public create1.154s, two reconnects0.445s/0.619s, hostReady true; default directory_delegationsY; 60 nonroot confined directory replays and ordinary fsync/write/rename/relative-symlink read pass; source inode/bytes/UUID and private modes/jobs preserved at observed scope. All owned resources cleaned. Prototype Pass only, no clean installer/current-product whole-matrix qualification.
