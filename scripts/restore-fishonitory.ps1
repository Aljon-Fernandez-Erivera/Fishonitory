[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$BackupFile,

  [Parameter(Mandatory = $true)]
  [string]$OutputDirectory,

  [Parameter(Mandatory = $true)]
  [string]$GpgSecretKey
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $BackupFile)) {
  throw "Backup file does not exist: $BackupFile"
}

if (-not (Get-Command gpg -ErrorAction SilentlyContinue)) {
  throw "gpg is not available on PATH."
}

if (-not (Get-Command mongorestore -ErrorAction SilentlyContinue)) {
  throw "mongorestore is not available on PATH."
}

New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null

$decryptedArchive = Join-Path `
  $OutputDirectory `
  "fishonitory-restore.archive.gz"

try {
  Write-Host "Decrypting backup..."

  & gpg `
    --batch `
    --yes `
    --output $decryptedArchive `
    --decrypt $BackupFile

  if ($LASTEXITCODE -ne 0) {
    throw "GPG decryption failed with exit code $LASTEXITCODE."
  }

  if (-not (Test-Path -LiteralPath $decryptedArchive)) {
    throw "Decrypted archive was not created."
  }

  $archiveFile = Get-Item -LiteralPath $decryptedArchive

  if ($archiveFile.Length -le 0) {
    throw "Decrypted archive is empty."
  }

  Write-Host "Decryption successful."
  Write-Host "Restoring backup..."

  & mongorestore `
    --archive=$decryptedArchive `
    --gzip `
    --drop

  if ($LASTEXITCODE -ne 0) {
    throw "mongorestore failed with exit code $LASTEXITCODE."
  }

  Write-Host ""
  Write-Host "Restore completed successfully."
}
finally {
  if (Test-Path -LiteralPath $decryptedArchive) {
    Remove-Item -LiteralPath $decryptedArchive -Force
  }
}