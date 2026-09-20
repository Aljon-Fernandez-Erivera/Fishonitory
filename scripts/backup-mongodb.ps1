[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$Recipient,

  [string]$BackupDirectory = "C:\FishonitoryBackups"
)

$ErrorActionPreference = "Stop"

function Get-DotEnvValue {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Name
  )

  foreach ($line in Get-Content -LiteralPath $Path) {
    if ($line -match "^\s*$([regex]::Escape($Name))\s*=\s*(.*)\s*$") {
      $value = $matches[1].Trim()
      if ($value.Length -ge 2 -and (
        ($value.StartsWith('"') -and $value.EndsWith('"')) -or
        ($value.StartsWith("'") -and $value.EndsWith("'"))
      )) {
        return $value.Substring(1, $value.Length - 2)
      }
      return $value
    }
  }

  return $null
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $projectRoot ".env"

if (-not (Test-Path -LiteralPath $envPath)) {
  throw "Cannot find $envPath. The backup was not created."
}

$mongoUri = Get-DotEnvValue -Path $envPath -Name "MONGODB_URI"
if ([string]::IsNullOrWhiteSpace($mongoUri)) {
  throw "MONGODB_URI is missing from $envPath. The backup was not created."
}

if (-not (Get-Command mongodump -ErrorAction SilentlyContinue)) {
  throw "mongodump is not available on PATH."
}

if (-not (Get-Command gpg -ErrorAction SilentlyContinue)) {
  throw "gpg is not available on PATH."
}

& gpg --batch --list-keys $Recipient *> $null
if ($LASTEXITCODE -ne 0) {
  throw "No public GPG key was found for '$Recipient'. Import or create its key first."
}

New-Item -ItemType Directory -Force -Path $BackupDirectory | Out-Null

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$archivePath = Join-Path $BackupDirectory "fishonitory-$timestamp.archive.gz"
$encryptedPath = "$archivePath.gpg"

try {
  # The URI is read only from the ignored .env file and is not written to the backup.
  & mongodump --uri=$mongoUri --db=fishonitory --archive=$archivePath --gzip
  if ($LASTEXITCODE -ne 0) {
    throw "mongodump failed with exit code $LASTEXITCODE."
  }

  & gpg --batch --yes --trust-model always --encrypt --recipient $Recipient --output $encryptedPath $archivePath
  if ($LASTEXITCODE -ne 0) {
    throw "GPG encryption failed with exit code $LASTEXITCODE."
  }
}
finally {
  # Keep only the encrypted copy when encryption succeeds. A failed encryption leaves
  # the archive in place so it can be recovered or securely deleted by the operator.
  if ((Test-Path -LiteralPath $encryptedPath) -and (Test-Path -LiteralPath $archivePath)) {
    Remove-Item -LiteralPath $archivePath -Force
  }
}

Write-Host "Encrypted backup created: $encryptedPath"
