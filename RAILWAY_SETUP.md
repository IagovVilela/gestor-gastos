# 🚂 Configuração do Railway - Passo a Passo

## ⚠️ IMPORTANTE: Configurar Root Directory

O Railway precisa saber qual é a pasta raiz de cada serviço. Siga estes passos:

## 📋 Passo 1: Criar Projeto no Railway

1. Acesse [railway.app](https://railway.app)
2. Faça login
3. Clique em **"New Project"**
4. Selecione **"Deploy from GitHub repo"** (ou seu repositório)
5. Selecione seu repositório

## 🗄️ Passo 2: Adicionar Banco de Dados

1. No projeto criado, clique em **"+ New"**
2. Selecione **"Database"**
3. Escolha **"MySQL"** (ou PostgreSQL se preferir)
4. **Anote a `DATABASE_URL`** que será exibida

## 🔧 Passo 3: Configurar Backend

### 3.1 Criar Serviço Backend

1. No projeto, clique em **"+ New"**
2. Selecione **"GitHub Repo"** novamente
3. Selecione o **mesmo repositório**
4. Após criar, clique no serviço para abrir as configurações

### 3.2 Configurar Root Directory (CRÍTICO!)

1. No serviço backend, vá em **Settings**
2. Role até **"Root Directory"**
3. Digite: `backend`
4. Clique em **"Save"**

### 3.3 Configurar Build e Start

1. Ainda em **Settings**, role até **"Deploy"**
2. **Build Command:** (deixe vazio ou use `npm install && npm run build && npm run postbuild`)
3. **Start Command:** `npm run start:prod`

**OU** use o arquivo `railway.json` que já está configurado (o Railway detecta automaticamente).

### 3.4 Variáveis de Ambiente

Vá em **Variables** e adicione:

```env
DATABASE_URL=mysql://user:password@host:port/database
JWT_SECRET=seu-jwt-secret-aqui
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=seu-refresh-secret-aqui
JWT_REFRESH_EXPIRES_IN=7d
NODE_ENV=production
FRONTEND_URL=https://seu-frontend.railway.app
```

**Nota:** `FRONTEND_URL` será configurado depois do deploy do frontend.

## 🎨 Passo 4: Configurar Frontend

### 4.1 Criar Serviço Frontend

1. No projeto, clique em **"+ New"**
2. Selecione **"GitHub Repo"** novamente
3. Selecione o **mesmo repositório**
4. Após criar, clique no serviço para abrir as configurações

### 4.2 Configurar Root Directory (CRÍTICO!)

1. No serviço frontend, vá em **Settings**
2. Role até **"Root Directory"**
3. Digite: `frontend`
4. Clique em **"Save"**

### 4.3 Configurar Build e Start

1. Ainda em **Settings**, role até **"Deploy"**
2. **Build Command:** (deixe vazio ou use `npm install && npm run build`)
3. **Start Command:** `npm run start`

**OU** use o arquivo `railway.json` que já está configurado.

### 4.4 Variáveis de Ambiente

Vá em **Variables** e adicione:

```env
NEXT_PUBLIC_API_URL=https://seu-backend.railway.app
```

**Nota:** Substitua `seu-backend.railway.app` pela URL real do backend (será gerada após o deploy).

## 🔄 Passo 5: Executar Migrations

Após o primeiro deploy do backend:

1. No serviço backend, vá em **Deployments**
2. Clique no deployment mais recente
3. Abra o **Terminal**
4. Execute:
   ```bash
   npx prisma migrate deploy
   ```

## 🔗 Passo 6: Configurar CORS

1. No serviço frontend, vá em **Settings**
2. Role até **"Generate Domain"** ou **"Custom Domain"**
3. Gere/configure o domínio
4. Anote a URL (ex: `seu-projeto.up.railway.app`)
5. Volte ao serviço backend
6. Em **Variables**, atualize:
   ```env
   FRONTEND_URL=https://seu-projeto.up.railway.app
   ```
7. Reinicie o backend (Settings → Restart)

## ✅ Verificação

1. Acesse a URL do frontend
2. Teste login/cadastro
3. Verifique Swagger: `https://seu-backend.railway.app/api`

## 🐛 Problemas Comuns

### "Script start.sh not found"
- **Solução:** Configure o **Root Directory** corretamente (`backend` ou `frontend`)

### "Railpack could not determine how to build"
- **Solução:** Certifique-se de que o Root Directory está configurado
- Verifique se há `package.json` na pasta configurada

### Build falha
- Verifique os logs no Railway
- Certifique-se de que todas as variáveis de ambiente estão configuradas
- Verifique se o `DATABASE_URL` está correto

### Frontend não conecta ao backend
- Verifique se `NEXT_PUBLIC_API_URL` está correto
- Verifique se `FRONTEND_URL` no backend está correto
- Verifique os logs de CORS no backend

## 📝 Resumo das Configurações

### Backend
- **Root Directory:** `backend`
- **Build Command:** `npm install && npm run build && npm run postbuild`
- **Start Command:** `npm run start:prod`

### Frontend
- **Root Directory:** `frontend`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm run start`

## 🔐 Gerar Secrets

```bash
# JWT Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Refresh Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```




