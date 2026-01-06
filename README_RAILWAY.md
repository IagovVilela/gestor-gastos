# 🚂 Deploy Rápido no Railway

## ⚠️ IMPORTANTE: Configure o Root Directory!

O Railway precisa saber qual é a pasta de cada serviço. **Configure o Root Directory** nas Settings de cada serviço.

## Passos Rápidos

### 1. Criar Projeto no Railway
1. Acesse [railway.app](https://railway.app)
2. Crie um novo projeto
3. Conecte seu repositório Git

### 2. Adicionar Banco de Dados
1. Clique em **"+ New"** → **"Database"** → **"MySQL"** (ou PostgreSQL)
2. Anote a `DATABASE_URL` que será gerada

### 3. Deploy do Backend
1. Clique em **"+ New"** → **"GitHub Repo"** (ou seu repositório)
2. Selecione o repositório
3. **IMPORTANTE:** Vá em **Settings** → **Root Directory** → Digite: `backend`
4. Configure (ou deixe o Railway detectar automaticamente via `railway.json`):
   - **Build Command:** `npm install && npm run build && npm run postbuild`
   - **Start Command:** `npm run start:prod`
5. Adicione as variáveis de ambiente (veja `backend/railway.env.example`)

### 4. Deploy do Frontend
1. Clique em **"+ New"** → **"GitHub Repo"** (mesmo repositório)
2. **IMPORTANTE:** Vá em **Settings** → **Root Directory** → Digite: `frontend`
3. Configure (ou deixe o Railway detectar automaticamente via `railway.json`):
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start`
4. Adicione a variável `NEXT_PUBLIC_API_URL` com a URL do backend

### 5. Executar Migrations
Após o primeiro deploy do backend, execute:
```bash
npx prisma migrate deploy
```
Ou use o terminal do Railway no serviço backend.

### 6. Configurar CORS
1. Gere o domínio do frontend no Railway
2. Atualize `FRONTEND_URL` no backend com essa URL
3. Reinicie o backend

## 📝 Variáveis de Ambiente

### Backend
- `DATABASE_URL` - URL do banco (fornecida pelo Railway)
- `JWT_SECRET` - Secret para JWT (gere um valor seguro)
- `JWT_REFRESH_SECRET` - Secret para refresh token (gere um valor seguro)
- `JWT_EXPIRES_IN="15m"`
- `JWT_REFRESH_EXPIRES_IN="7d"`
- `NODE_ENV="production"`
- `FRONTEND_URL` - URL do frontend (após deploy)

### Frontend
- `NEXT_PUBLIC_API_URL` - URL do backend

## 🔐 Gerar Secrets Seguros

```bash
# JWT Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Refresh Secret  
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## ✅ Verificação

1. Acesse a URL do frontend
2. Teste login/cadastro
3. Verifique Swagger: `https://seu-backend.railway.app/api`

## 📚 Documentação Completa

Veja `RAILWAY_DEPLOY.md` para guia detalhado.

