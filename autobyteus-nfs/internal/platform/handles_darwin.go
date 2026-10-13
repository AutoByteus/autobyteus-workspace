package platform

// Apple nfsd owns APFS handle generation; Linux VFS calls are not used on Mac.
func QualifyHandles(source string) error { return QualifyFilesystem(source) }
