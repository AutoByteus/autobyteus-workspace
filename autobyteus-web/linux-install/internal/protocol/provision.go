package protocol

// pkexec preserves the invoked program's status. Only the authenticated
// provisioner's install-volume preflight uses this code; 126/127 belong to pkexec.
const ExitInsufficientInstallSpace = 78
