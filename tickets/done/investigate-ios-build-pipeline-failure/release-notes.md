# v1.3.49 Release Notes

- Fixed the iOS App Store Connect/TestFlight release workflow so simulator build/test and archive/upload jobs select Xcode 26 or newer before running Xcode commands.
- Added `IOS_XCODE_APP_PATH` documentation for updating the GitHub-hosted runner Xcode path if runner images change.
- Preserved existing iOS signing, provisioning profile, and App Store Connect secret handling while resolving the previous iOS SDK validation failure.
