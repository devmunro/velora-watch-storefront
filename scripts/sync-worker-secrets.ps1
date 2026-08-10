$ErrorActionPreference = 'Stop'

$varsFile = Join-Path (Get-Location) '.dev.vars'
if (-not (Test-Path -LiteralPath $varsFile)) {
  throw 'Create .dev.vars from .dev.vars.example before syncing secrets.'
}

$values = @{}
Get-Content -LiteralPath $varsFile | ForEach-Object {
  if ($_ -match '^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$' -and $matches[2] -notmatch 'replace_me') {
    $values[$matches[1]] = $matches[2]
  }
}

foreach ($name in @('SUPABASE_SECRET_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET')) {
  if (-not $values.ContainsKey($name)) { throw "Missing $name in .dev.vars." }
  $values[$name] | pnpm exec wrangler secret put $name --name velora-storefront
}

Write-Output 'Worker secrets synced. Secret values were not written to the repository.'
