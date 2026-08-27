[CmdletBinding()]
param(
  [string]$OutputPath = ""
)

$ErrorActionPreference = "Stop"
$repositoryRoot = [System.IO.Path]::GetFullPath(
  (Join-Path -Path $PSScriptRoot -ChildPath "..")
)

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
  $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $OutputPath = Join-Path $repositoryRoot ".artifacts/restaurant-source-$timestamp.zip"
} elseif (-not [System.IO.Path]::IsPathRooted($OutputPath)) {
  $OutputPath = Join-Path $repositoryRoot $OutputPath
}

$resolvedOutput = [System.IO.Path]::GetFullPath($OutputPath)
if (Test-Path -LiteralPath $resolvedOutput) {
  throw "The package output already exists. Choose a new output path."
}

$trackedSecretEnvironments = @(
  & git -C $repositoryRoot ls-files -- ".env" ".env.local" ".env.production" ".env.development" ".env.staging"
)
if ($LASTEXITCODE -ne 0) {
  throw "Unable to inspect Git tracking."
}
if ($trackedSecretEnvironments.Count -gt 0) {
  throw "A secret environment file is tracked by Git. Packaging was stopped."
}

$candidates = @(
  & git -C $repositoryRoot ls-files --cached --others --exclude-standard
)
if ($LASTEXITCODE -ne 0) {
  throw "Unable to list source files."
}

$approvedFiles = foreach ($candidate in $candidates) {
  $normalized = $candidate.Replace("\", "/")
  if ($normalized -match "(^|/)(node_modules|\.next|\.git|coverage|temp|tmp)(/|$)") {
    continue
  }
  if (
    $normalized -match "(^|/)\.env($|\.)" -and
    $normalized -ne ".env.example"
  ) {
    continue
  }
  if ($normalized -match "(\.log|\.tmp|\.temp|~)$") {
    continue
  }
  $normalized
}

if ($approvedFiles.Count -eq 0) {
  throw "No source files were selected for packaging."
}

$outputDirectory = Split-Path -Parent $resolvedOutput
[System.IO.Directory]::CreateDirectory($outputDirectory) | Out-Null
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::Open(
  $resolvedOutput,
  [System.IO.Compression.ZipArchiveMode]::Create
)
try {
  foreach ($relativePath in $approvedFiles) {
    $sourcePath = Join-Path $repositoryRoot $relativePath
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
      $archive,
      $sourcePath,
      $relativePath,
      [System.IO.Compression.CompressionLevel]::Optimal
    ) | Out-Null
  }
} finally {
  $archive.Dispose()
}

Write-Output "Created safe source package with $($approvedFiles.Count) files:"
Write-Output $resolvedOutput
