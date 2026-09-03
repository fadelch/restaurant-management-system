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

$workingTree = @(
  & git -C $repositoryRoot status --porcelain=v1 --untracked-files=all
)
if ($LASTEXITCODE -ne 0) {
  throw "Unable to inspect the Git working tree."
}
if ($workingTree.Count -gt 0) {
  throw "The Git working tree must be clean before creating a release package."
}

$trackedSecretEnvironments = @(
  & git -C $repositoryRoot ls-files -- ".env*"
) | Where-Object { $_ -ne ".env.example" }
if ($LASTEXITCODE -ne 0) {
  throw "Unable to inspect Git tracking."
}
if ($trackedSecretEnvironments.Count -gt 0) {
  throw "A secret environment file is tracked by Git. Packaging was stopped."
}

$trackedSecretFiles = @(
  & git -C $repositoryRoot ls-files
) | Where-Object {
  $normalized = $_.Replace("\", "/")
  $normalized -match "(^|/)(\.secrets|secrets)(/|$)" -or
  $normalized -match "(^|/)credentials[^/]*\.json$" -or
  $normalized -match "\.(pem|key|p12|pfx)$"
}
if ($trackedSecretFiles.Count -gt 0) {
  throw "A generated credential/secret file is tracked by Git. Packaging was stopped."
}

$candidates = @(
  & git -C $repositoryRoot ls-files --cached
)
if ($LASTEXITCODE -ne 0) {
  throw "Unable to list source files."
}

$approvedFiles = foreach ($candidate in $candidates) {
  $normalized = $candidate.Replace("\", "/")
  if (
    $normalized -match
    "(^|/)(node_modules|\.next|\.git|coverage|logs?|temp|tmp|\.tmp|\.cache|\.artifacts|\.secrets|secrets|out|build|dist)(/|$)"
  ) {
    continue
  }
  if (
    $normalized -match "(^|/)\.env($|\.)" -and
    $normalized -ne ".env.example"
  ) {
    continue
  }
  if ($normalized -match "(\.log|\.tmp|\.temp|\.bak|\.swp|~)$") {
    continue
  }
  if ($normalized -match "\.(pem|key|p12|pfx)$") {
    continue
  }
  if ($normalized -match "(^|/)credentials[^/]*\.json$") {
    continue
  }
  $normalized
}

if ($approvedFiles.Count -eq 0) {
  throw "No source files were selected for packaging."
}

$requiredFiles = @(
  ".env.example",
  "README.md",
  "package.json",
  "package-lock.json",
  "prisma/schema.prisma"
)
foreach ($requiredFile in $requiredFiles) {
  if ($approvedFiles -notcontains $requiredFile) {
    throw "Required release file is missing from the package: $requiredFile"
  }
}
if (-not ($approvedFiles | Where-Object { $_ -match "^prisma/migrations/.+/migration\.sql$" })) {
  throw "No Prisma migrations were selected for the release package."
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
