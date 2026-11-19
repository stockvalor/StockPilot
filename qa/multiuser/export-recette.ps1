param([Parameter(Mandatory)][string]$OutputDirectory)
$ErrorActionPreference = 'Stop'
$project = 'qofvnaomefqkemtxhmoi'
$hostName = "db.$project.supabase.co"
$null = Get-Command pg_dump -ErrorAction Stop
$null = New-Item -ItemType Directory -Force -Path $OutputDirectory
$target = Join-Path $OutputDirectory ('schema-recette-' + [guid]::NewGuid() + '.sql')
$partial = "$target.partial"
try {
    & pg_dump --dbname="host=$hostName port=5432 user=postgres dbname=postgres sslmode=require" --password --schema-only --quote-all-identifiers --file=$partial
    if ($LASTEXITCODE -ne 0) { throw 'Export incomplet. Vérifier la connexion directe de recette et la version de pg_dump.' }
    Move-Item -LiteralPath $partial -Destination $target
    Get-FileHash -LiteralPath $target -Algorithm SHA256
} finally {
    if (Test-Path -LiteralPath $partial) { Remove-Item -LiteralPath $partial }
}
