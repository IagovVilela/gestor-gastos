Write-Host "🔍 Verificando status do servidor..." -ForegroundColor Cyan
Write-Host ""

# Verificar se a porta está em uso
$port = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
if ($port) {
    Write-Host "✅ Porta 3001 está em uso" -ForegroundColor Green
    $port | Format-Table LocalAddress, LocalPort, State
} else {
    Write-Host "❌ Porta 3001 não está em uso (servidor não está rodando)" -ForegroundColor Red
}

Write-Host ""
Write-Host "🔍 Verificando conexão com MySQL..." -ForegroundColor Cyan

# Verificar se o arquivo .env existe
if (Test-Path .env) {
    Write-Host "✅ Arquivo .env encontrado" -ForegroundColor Green
    
    # Ler DATABASE_URL do .env
    $envContent = Get-Content .env
    $dbUrl = $envContent | Where-Object { $_ -match "DATABASE_URL" }
    if ($dbUrl) {
        Write-Host "✅ DATABASE_URL configurado" -ForegroundColor Green
        # Mascarar senha
        $maskedUrl = $dbUrl -replace ':[^:@]+@', ':****@'
        Write-Host "   $maskedUrl" -ForegroundColor Gray
    } else {
        Write-Host "❌ DATABASE_URL não encontrado no .env" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Arquivo .env não encontrado!" -ForegroundColor Red
    Write-Host "   Crie o arquivo .env baseado no env.example" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📋 Para iniciar o servidor manualmente:" -ForegroundColor Cyan
Write-Host "   npm run start:dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "📋 Para ver os logs de erro:" -ForegroundColor Cyan
Write-Host "   Execute o comando acima e verifique a saída no terminal" -ForegroundColor Yellow


