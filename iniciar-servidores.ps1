# Script para iniciar Backend e Frontend de forma estável
# Garante que os servidores continuem rodando mesmo com alterações

# Configurar encoding UTF-8 para caracteres especiais
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  INICIANDO SERVIDORES - GESTAO DE GASTOS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Cores para output
$ErrorColor = "Red"
$SuccessColor = "Green"
$InfoColor = "Cyan"
$WarningColor = "Yellow"

# Função para verificar se uma porta está em uso
function Test-Port {
    param([int]$Port)
    try {
        $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        return $null -ne $connection
    } catch {
        return $false
    }
}

# Função para finalizar processos em portas específicas
function Stop-PortProcess {
    param([int]$Port)
    try {
        $processes = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | 
            Select-Object -ExpandProperty OwningProcess -Unique
        if ($processes) {
            foreach ($pid in $processes) {
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            }
            Start-Sleep -Seconds 2
            Write-Host "[OK] Processos na porta $Port finalizados" -ForegroundColor $SuccessColor
            return $true
        }
        return $false
    } catch {
        return $false
    }
}

# Limpar processos anteriores
Write-Host "[1/5] Limpando processos anteriores..." -ForegroundColor $InfoColor
$cleanedBackend = Stop-PortProcess -Port 3001
$cleanedFrontend = Stop-PortProcess -Port 3000
$cleanedPort3002 = Stop-PortProcess -Port 3002  # Caso frontend tenha usado porta alternativa

if (-not $cleanedBackend -and -not $cleanedFrontend) {
    Write-Host "    Nenhum processo anterior encontrado" -ForegroundColor Gray
}
Write-Host ""

# Caminhos dos projetos
$BackendPath = Join-Path $PSScriptRoot "backend"
$FrontendPath = Join-Path $PSScriptRoot "frontend"

# Verificar se os diretórios existem
Write-Host "[2/5] Verificando estrutura do projeto..." -ForegroundColor $InfoColor
if (-not (Test-Path $BackendPath)) {
    Write-Host "[ERRO] Diretorio backend nao encontrado: $BackendPath" -ForegroundColor $ErrorColor
    Write-Host "Pressione qualquer tecla para sair..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}
Write-Host "    Backend encontrado: $BackendPath" -ForegroundColor Gray

if (-not (Test-Path $FrontendPath)) {
    Write-Host "[ERRO] Diretorio frontend nao encontrado: $FrontendPath" -ForegroundColor $ErrorColor
    Write-Host "Pressione qualquer tecla para sair..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}
Write-Host "    Frontend encontrado: $FrontendPath" -ForegroundColor Gray
Write-Host ""

# Verificar se node_modules existe
Write-Host "[3/5] Verificando dependencias..." -ForegroundColor $InfoColor
if (-not (Test-Path "$BackendPath\node_modules")) {
    Write-Host "[AVISO] node_modules do backend nao encontrado!" -ForegroundColor $WarningColor
    Write-Host "        Execute: cd backend; npm install" -ForegroundColor $WarningColor
}
if (-not (Test-Path "$FrontendPath\node_modules")) {
    Write-Host "[AVISO] node_modules do frontend nao encontrado!" -ForegroundColor $WarningColor
    Write-Host "        Execute: cd frontend; npm install" -ForegroundColor $WarningColor
}
Write-Host ""

# Iniciar Backend em nova janela
Write-Host "[4/5] Iniciando Backend..." -ForegroundColor $InfoColor
Write-Host "    Abrindo janela do Backend..." -ForegroundColor Gray

$backendCommand = @"
cd '$BackendPath'
Write-Host '' 
Write-Host '========================================' -ForegroundColor Cyan
Write-Host '  BACKEND - GESTAO DE GASTOS' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''
Write-Host 'Porta: http://localhost:3001' -ForegroundColor Green
Write-Host 'Swagger: http://localhost:3001/api' -ForegroundColor Green
Write-Host ''
Write-Host 'Iniciando servidor...' -ForegroundColor Yellow
Write-Host ''
npm run start:dev
"@

try {
    $backendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCommand -PassThru -WindowStyle Normal
    Write-Host "    Backend iniciado (PID: $($backendProcess.Id))" -ForegroundColor $SuccessColor
} catch {
    Write-Host "[ERRO] Falha ao iniciar Backend: $_" -ForegroundColor $ErrorColor
    Write-Host "Pressione qualquer tecla para sair..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Aguardar backend iniciar
Write-Host "    Aguardando Backend estar pronto..." -ForegroundColor Gray
Start-Sleep -Seconds 5

# Verificar se backend está respondendo
$backendReady = $false
Write-Host "    Verificando porta 3001..." -ForegroundColor Gray
for ($i = 1; $i -le 15; $i++) {
    Start-Sleep -Seconds 2
    if (Test-Port -Port 3001) {
        Write-Host "    [OK] Backend esta rodando na porta 3001!" -ForegroundColor $SuccessColor
        $backendReady = $true
        break
    }
    if ($i -lt 15) {
        Write-Host "    Tentativa $i/15..." -ForegroundColor DarkGray
    }
}

if (-not $backendReady) {
    Write-Host "    [AVISO] Backend pode ainda estar inicializando..." -ForegroundColor $WarningColor
    Write-Host "            Verifique a janela do Backend para ver os logs" -ForegroundColor $WarningColor
}
Write-Host ""

# Iniciar Frontend em nova janela
Write-Host "[5/5] Iniciando Frontend..." -ForegroundColor $InfoColor
Write-Host "    Abrindo janela do Frontend..." -ForegroundColor Gray

$frontendCommand = @"
cd '$FrontendPath'
Write-Host ''
Write-Host '========================================' -ForegroundColor Cyan
Write-Host '  FRONTEND - GESTAO DE GASTOS' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''
Write-Host 'URL: http://localhost:3000' -ForegroundColor Green
Write-Host ''
Write-Host 'Iniciando servidor na porta 3000...' -ForegroundColor Yellow
Write-Host ''
`$env:PORT='3000'; npm run dev -- -p 3000
"@

try {
    $frontendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCommand -PassThru -WindowStyle Normal
    Write-Host "    Frontend iniciado (PID: $($frontendProcess.Id))" -ForegroundColor $SuccessColor
} catch {
    Write-Host "[ERRO] Falha ao iniciar Frontend: $_" -ForegroundColor $ErrorColor
    Write-Host "Pressione qualquer tecla para sair..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Aguardar frontend iniciar
Write-Host "    Aguardando Frontend estar pronto..." -ForegroundColor Gray
Start-Sleep -Seconds 5

# Verificar se frontend está respondendo
$frontendReady = $false
Write-Host "    Verificando porta 3000..." -ForegroundColor Gray
for ($i = 1; $i -le 20; $i++) {
    Start-Sleep -Seconds 2
    if (Test-Port -Port 3000) {
        Write-Host "    [OK] Frontend esta rodando na porta 3000!" -ForegroundColor $SuccessColor
        $frontendReady = $true
        break
    }
    if ($i -lt 20) {
        Write-Host "    Tentativa $i/20..." -ForegroundColor DarkGray
    }
}

if (-not $frontendReady) {
    Write-Host "    [AVISO] Frontend pode ainda estar compilando..." -ForegroundColor $WarningColor
    Write-Host "            A primeira compilacao pode levar 1-2 minutos" -ForegroundColor $WarningColor
    Write-Host "            Verifique a janela do Frontend para ver os logs" -ForegroundColor $WarningColor
}
Write-Host ""

# Resumo
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SERVIDORES INICIADOS COM SUCESSO!" -ForegroundColor $SuccessColor
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "URLs do Sistema:" -ForegroundColor $InfoColor
Write-Host "  Frontend: " -NoNewline -ForegroundColor White
Write-Host "http://localhost:3000" -ForegroundColor Green
Write-Host "  Backend:  " -NoNewline -ForegroundColor White
Write-Host "http://localhost:3001" -ForegroundColor Green
Write-Host "  Swagger:  " -NoNewline -ForegroundColor White
Write-Host "http://localhost:3001/api" -ForegroundColor Green
Write-Host ""

Write-Host "Status:" -ForegroundColor $InfoColor
if ($backendReady) {
    Write-Host "  Backend:  " -NoNewline -ForegroundColor White
    Write-Host "[ONLINE]" -ForegroundColor $SuccessColor
} else {
    Write-Host "  Backend:  " -NoNewline -ForegroundColor White
    Write-Host "[INICIANDO...]" -ForegroundColor $WarningColor
}

if ($frontendReady) {
    Write-Host "  Frontend: " -NoNewline -ForegroundColor White
    Write-Host "[ONLINE]" -ForegroundColor $SuccessColor
} else {
    Write-Host "  Frontend: " -NoNewline -ForegroundColor White
    Write-Host "[COMPILANDO...]" -ForegroundColor $WarningColor
}
Write-Host ""

Write-Host "Informacoes:" -ForegroundColor $InfoColor
Write-Host "  - Os servidores estao rodando em janelas separadas" -ForegroundColor Gray
Write-Host "  - Alteracoes nos arquivos serao detectadas automaticamente (hot reload)" -ForegroundColor Gray
Write-Host "  - Os servidores continuarao rodando mesmo com alteracoes" -ForegroundColor Gray
Write-Host "  - Para parar, feche as janelas ou execute: .\parar-servidores.ps1" -ForegroundColor Gray
Write-Host ""

# Salvar PIDs para referência
try {
    $backendProcess.Id | Out-File -FilePath "$PSScriptRoot\.backend.pid" -Encoding ASCII -Force -ErrorAction SilentlyContinue
    $frontendProcess.Id | Out-File -FilePath "$PSScriptRoot\.frontend.pid" -Encoding ASCII -Force -ErrorAction SilentlyContinue
} catch {
    # Ignorar erro ao salvar PIDs
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Script concluido. Servidores em execucao." -ForegroundColor $SuccessColor
Write-Host "  Esta janela pode ser fechada." -ForegroundColor Gray
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Pressione qualquer tecla para fechar esta janela..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
