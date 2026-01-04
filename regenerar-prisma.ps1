# Script para regenerar Prisma Client
Write-Host "`n🔄 Regenerando Prisma Client...`n" -ForegroundColor Cyan

# Parar processos do Node que possam estar usando o Prisma
Write-Host "Parando processos Node...`n" -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Ir para o diretório backend
Set-Location backend

# Regenerar Prisma Client
Write-Host "Executando: npx prisma generate`n" -ForegroundColor Yellow
npx prisma generate

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Prisma Client regenerado com sucesso!`n" -ForegroundColor Green
    Write-Host "Agora você pode reiniciar o servidor backend." -ForegroundColor Cyan
} else {
    Write-Host "`n❌ Erro ao regenerar Prisma Client" -ForegroundColor Red
    Write-Host "Tente executar manualmente: cd backend && npx prisma generate" -ForegroundColor Yellow
}

Set-Location ..

