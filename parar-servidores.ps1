# Script para parar todos os servidores

Write-Host "`n🛑 Parando servidores...`n" -ForegroundColor Yellow

# Função para parar processos em uma porta
function Stop-PortProcess {
    param([int]$Port)
    try {
        $processes = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | 
            Select-Object -ExpandProperty OwningProcess -Unique
        if ($processes) {
            foreach ($pid in $processes) {
                $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
                if ($proc) {
                    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                    Write-Host "✅ Processo na porta $Port finalizado (PID: $pid)" -ForegroundColor Green
                }
            }
        } else {
            Write-Host "ℹ️ Nenhum processo encontrado na porta $Port" -ForegroundColor Gray
        }
    } catch {
        Write-Host "⚠️ Erro ao parar processos na porta $Port" -ForegroundColor Yellow
    }
}

# Parar processos Node.js
Write-Host "Parando processos Node.js..." -ForegroundColor Cyan
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    $nodeProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "✅ Processos Node.js finalizados" -ForegroundColor Green
} else {
    Write-Host "ℹ️ Nenhum processo Node.js encontrado" -ForegroundColor Gray
}

# Parar processos nas portas específicas
Write-Host "`nParando processos nas portas..." -ForegroundColor Cyan
Stop-PortProcess -Port 3000  # Frontend
Stop-PortProcess -Port 3001  # Backend

# Parar jobs do PowerShell
Write-Host "`nParando jobs do PowerShell..." -ForegroundColor Cyan
Get-Job | Stop-Job -ErrorAction SilentlyContinue
Get-Job | Remove-Job -ErrorAction SilentlyContinue
Write-Host "✅ Jobs finalizados" -ForegroundColor Green

Write-Host "`n✅ Todos os servidores foram parados!`n" -ForegroundColor Green


