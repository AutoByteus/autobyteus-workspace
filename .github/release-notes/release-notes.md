# Release Notes

- Fixed Windows desktop startup failure caused by invalid Prisma SQLite URLs such as `file:/C:/...`.
- Windows SQLite database URLs are now generated as `file:C:/...`; macOS/Linux URL behavior is unchanged.
- Added a standalone Windows repair script and guide for already affected local installs.
