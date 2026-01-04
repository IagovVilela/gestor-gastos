# 🔧 Troubleshooting - Servidor não inicia

## Problema: ERR_CONNECTION_REFUSED

O servidor não está respondendo na porta 3001. Siga estes passos:

### 1. Verificar se o MySQL está rodando

**XAMPP:**
- Abra o XAMPP Control Panel
- Verifique se o MySQL está com status "Running" (verde)
- Se não estiver, clique em "Start"

**Serviço Windows:**
```powershell
Get-Service -Name "*mysql*"
```

### 2. Verificar conexão com o banco

Teste a conexão manualmente:
```powershell
# No XAMPP Shell ou MySQL Workbench
mysql -u root -p
# Digite sua senha
USE gestao_gastos;
SHOW TABLES;
```

### 3. Verificar arquivo .env

Certifique-se de que o arquivo `.env` existe e está configurado:

```env
DATABASE_URL="mysql://root:SUA_SENHA@127.0.0.1:3306/gestao_gastos"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-in-production"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=3001
NODE_ENV=development
FRONTEND_URL="http://localhost:3000"
```

**Importante:** Substitua `SUA_SENHA` pela senha real do MySQL.

### 4. Gerar Prisma Client

```powershell
npm run prisma:generate
```

### 5. Executar migrations

```powershell
npm run prisma:migrate
```

### 6. Iniciar servidor e ver erros

Execute em um terminal separado para ver os logs:

```powershell
npm run start:dev
```

**Erros comuns:**

1. **"Can't reach database server"**
   - MySQL não está rodando
   - Senha incorreta no DATABASE_URL
   - Host incorreto (use 127.0.0.1 ao invés de localhost)

2. **"Unknown database 'gestao_gastos'"**
   - Execute: `npm run prisma:migrate`

3. **"Port 3001 already in use"**
   - Feche outros processos Node.js
   - Ou mude a porta no .env

### 7. Verificar se a porta está livre

```powershell
Get-NetTCPConnection -LocalPort 3001
```

Se houver conexões, finalize:
```powershell
Get-Process -Name node | Stop-Process -Force
```

### 8. Testar servidor

Após iniciar, acesse:
- API: http://localhost:3001
- Swagger: http://localhost:3001/api

---

## Comandos úteis

```powershell
# Parar todos os processos Node
Get-Process -Name node | Stop-Process -Force

# Verificar porta
Get-NetTCPConnection -LocalPort 3001

# Ver logs do servidor
npm run start:dev

# Reinstalar dependências
npm install

# Limpar e reconstruir
npm run build
```

