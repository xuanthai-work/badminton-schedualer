# Simulates a bank balance-change notification and POSTs it to the BSche
# payment webhook so the reconciliation flow can be tested end-to-end.
#
# Usage:
#   pwsh ./scripts/test-webhook.ps1
#   pwsh ./scripts/test-webhook.ps1 -Content "ND: BS 8A2F9B1C 3D4E5F" -Amount 50000
#   pwsh ./scripts/test-webhook.ps1 -Secret "wrong"   # expect 401

param(
  [string]$BaseUrl = "http://localhost:3000",
  [string]$Secret = $env:BANK_WEBHOOK_SECRET,
  [string]$Content = "So du TK 123456789: +50,000 VND. ND: BSCHEL 8A2F9B1C 3D4E5F GD 987654321",
  [int]$Amount = 50000,
  [string]$Bank = "VCB",
  [string]$TransactionId = "FT12345678"
)

if ([string]::IsNullOrWhiteSpace($Secret)) {
  $Secret = "your-bank-webhook-secret"
  Write-Host "[warn] BANK_WEBHOOK_SECRET not set; using placeholder. Pass -Secret to match the server." -ForegroundColor Yellow
}

$uri = "$BaseUrl/api/webhook/bank-payment"

$payload = @{
  bank          = $Bank
  amount        = $Amount
  content       = $Content
  transactionId = $TransactionId
} | ConvertTo-Json

Write-Host "POST $uri" -ForegroundColor Cyan
Write-Host $payload

try {
  $response = Invoke-WebRequest `
    -Uri $uri `
    -Method Post `
    -ContentType "application/json" `
    -Headers @{ "x-webhook-secret" = $Secret } `
    -Body $payload

  Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
  Write-Host $response.Content
}
catch {
  $status = $_.Exception.Response.StatusCode.value__
  Write-Host "Status: $status" -ForegroundColor Red
  if ($_.ErrorDetails) {
    Write-Host $_.ErrorDetails.Message
  }
  else {
    Write-Host $_.Exception.Message -ForegroundColor Red
  }
}
