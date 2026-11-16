# OfficerLab AI Companion setup for Windows 10/11
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Vendor = Join-Path $Root "vendor\sign-in-with-chatgpt-devkit"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Install Node.js 22.12+ first: https://nodejs.org/" }
$NodeVersion = (node -p "process.versions.node").Trim()
if ([version]$NodeVersion -lt [version]"22.12.0") { throw "Node.js 22.12 or later is required. Found $NodeVersion" }
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw "Install Git for Windows first: https://git-scm.com/download/win" }
if (-not (Test-Path $Vendor)) {
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Vendor) | Out-Null
  git clone --depth 1 https://github.com/openai/sign-in-with-chatgpt-devkit.git $Vendor
  if ($LASTEXITCODE -ne 0) { throw "Could not download the official OpenAI DevKit." }
}
Push-Location $Vendor
try {
  npm install
  if ($LASTEXITCODE -ne 0) { throw "OpenAI DevKit dependency installation failed." }
  npm run build -w @siwc/local
  if ($LASTEXITCODE -ne 0) { throw "Official @siwc/local package build failed." }
} finally { Pop-Location }
Push-Location (Join-Path $Root "desktop")
try {
  npm install
  if ($LASTEXITCODE -ne 0) { throw "OfficerLab desktop dependency installation failed." }
  Write-Host "Setup complete. Start with: npm start" -ForegroundColor Green
} finally { Pop-Location }