# Windows SQLite URL Repair

Use this only for affected Windows desktop installs where AutoByteus fails to start because Prisma cannot open SQLite.

## Symptom

`C:\Users\<you>\.autobyteus\logs\app.log` contains a Prisma startup failure similar to:

```text
Failed to open SQLite database
The filename, directory name, or volume label syntax is incorrect. (os error 123)
```

The generated server config contains the invalid Windows URL shape:

```text
DATABASE_URL=file:/C:/Users/<you>/.autobyteus/server-data/db/production.db
```

The valid Prisma SQLite URL shape is:

```text
DATABASE_URL=file:C:/Users/<you>/.autobyteus/server-data/db/production.db
```

## Repair

Close AutoByteus, then run PowerShell as Administrator if AutoByteus is installed under `Program Files`.

From the repository root:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\repair-windows-prisma-sqlite-url.ps1
```

If AutoByteus is installed somewhere else:

```powershell
.\scripts\repair-windows-prisma-sqlite-url.ps1 -InstallDir "D:\Program Files\AutoByteus"
```

If the server data directory is not under your Windows profile:

```powershell
.\scripts\repair-windows-prisma-sqlite-url.ps1 -ServerDataDir "C:\Path\To\server-data"
```

The script stops running AutoByteus processes, patches the affected packaged Electron URL generator when needed, fixes the generated `.env`, and creates `.bak-<timestamp>` backups beside any modified files.

## Policy

This is a one-time environment repair for already-generated bad Windows install artifacts. Product runtime code must generate the correct URL going forward and must not keep a backward-compatible fallback for the invalid `file:/C:/...` shape.
