# Moonshine Additional Signing Script
# Signs any remaining unsigned executables

param(
    [Parameter(Mandatory=$false)]
    [string]$CertPath = "dist\moonshine-dev.pfx"
)

Write-Host "Moonshine Additional Signing" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan

$Password = $env:MOONSHINE_CERT_PASSWORD
if (-not $Password) {
    $securePassword = Read-Host -AsSecureString -Prompt "Enter PFX password"
    $Password = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword))
}

# Get version from package.json
$packageJson = Get-Content "package.json" | ConvertFrom-Json
$version = $packageJson.version

# Files to sign
$filesToSign = @(
    "dist\Moonshine Setup $version.exe",
    "dist\win-unpacked\Moonshine.exe"
)

Write-Host "Checking files to sign..." -ForegroundColor Yellow

foreach ($file in $filesToSign) {
    if (Test-Path $file) {
        Write-Host "Found: $file" -ForegroundColor Green
        
        Write-Host "Signing: $file" -ForegroundColor Yellow
        
        try {
            $result = & signtool sign /f $CertPath /p $Password /tr "http://timestamp.digicert.com" /td sha256 /fd sha256 /v $file
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✓ Successfully signed: $file" -ForegroundColor Green
            } else {
                Write-Host "✗ Failed to sign: $file" -ForegroundColor Red
                Write-Host "Error: $result" -ForegroundColor Red
            }
        } catch {
            Write-Host "✗ Exception signing: $file" -ForegroundColor Red
            Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        }
        
        Write-Host ""
    } else {
        Write-Host "✗ File not found: $file" -ForegroundColor Red
    }
}

Write-Host "Signing process complete!" -ForegroundColor Cyan