# 🚀 Guia de Deploy no Railway

Este guia explica como fazer o deploy do sistema de Gestão de Gastos no Railway.

## 📋 Pré-requisitos

1. Conta no [Railway](https://railway.app)
2. Repositório Git (GitHub, GitLab ou Bitbucket)
3. Projeto conectado ao Railway

## 🗄️ Passo 1: Criar Banco de Dados

1. No Railway, crie um novo projeto
2. Adicione um serviço **MySQL** ou **PostgreSQL**
3. Anote a URL de conexão do banco (será usada como `DATABASE_URL`)

**Nota:** O Railway oferece MySQL e PostgreSQL. Se usar PostgreSQL, você precisará atualizar o `schema.prisma` para usar `provider = "postgresql"`.

## 🔧 Passo 2: Configurar Backend

### 2.1 Criar Serviço Backend

1. No mesmo projeto Railway, adicione um novo serviço
2. Selecione **"Deploy from GitHub repo"** (ou seu repositório)
3. Configure:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install && npm run build && npx prisma generate`
   - **Start Command:** `npm run start:prod`

### 2.2 Variáveis de Ambiente do Backend

Adicione as seguintes variáveis de ambiente no serviço backend:

```env
# Database (use a URL fornecida pelo Railway)
DATABASE_URL="mysql://user:password@host:port/database"
# ou para PostgreSQL:
# DATABASE_URL="postgresql://user:password@host:port/database?schema=public"

# JWT Secrets (gere valores aleatórios e seguros)
JWT_SECRET="seu-jwt-secret-super-seguro-aqui"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="seu-refresh-secret-super-seguro-aqui"
JWT_REFRESH_EXPIRES_IN="7d"

# Application
PORT=3001
NODE_ENV=production

# CORS (URL do frontend - será configurada depois)
FRONTEND_URL="https://seu-frontend.railway.app"
```

### 2.3 Executar Migrations

Após o primeiro deploy do backend, execute as migrations:

1. No Railway, vá em **Settings** do serviço backend
2. Abra o terminal ou use o comando:
   ```bash
   npx prisma migrate deploy
   ```

Ou adicione um script de post-deploy no `package.json` (já incluído).

## 🎨 Passo 3: Configurar Frontend

### 3.1 Criar Serviço Frontend

1. No mesmo projeto Railway, adicione outro serviço
2. Selecione **"Deploy from GitHub repo"** (mesmo repositório)
3. Configure:
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start`

### 3.2 Variáveis de Ambiente do Frontend

Adicione as seguintes variáveis de ambiente no serviço frontend:

```env
# API URL (URL do backend no Railway)
NEXT_PUBLIC_API_URL="https://seu-backend.railway.app"
```

### 3.3 Configurar Domínio

1. No serviço frontend, vá em **Settings** → **Generate Domain**
2. Anote a URL gerada (ex: `seu-projeto.up.railway.app`)
3. Atualize a variável `FRONTEND_URL` no backend com essa URL

## 🔄 Passo 4: Atualizar CORS

Após obter a URL do frontend, atualize a variável `FRONTEND_URL` no backend:

```env
FRONTEND_URL="https://seu-frontend.railway.app"
```

Reinicie o serviço backend para aplicar as mudanças.

## 📁 Passo 5: Configurar Uploads (Opcional)

Se você precisar de uploads persistentes:

1. No Railway, adicione um serviço **Volume**
2. Monte o volume no backend no caminho `/uploads`
3. Configure o volume para persistir dados

**Nota:** Sem volume, os uploads serão perdidos ao reiniciar o serviço.

## ✅ Passo 6: Verificar Deploy

1. Acesse a URL do frontend
2. Teste o login/cadastro
3. Verifique se as requisições ao backend estão funcionando
4. Acesse a documentação Swagger: `https://seu-backend.railway.app/api`

## 🔐 Segurança

### Gerar Secrets Seguros

Use um gerador de senhas ou execute:

```bash
# JWT Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Refresh Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 🐛 Troubleshooting

### Backend não inicia

- Verifique se todas as variáveis de ambiente estão configuradas
- Verifique os logs no Railway
- Certifique-se de que o banco de dados está acessível

### Frontend não conecta ao backend

- Verifique se `NEXT_PUBLIC_API_URL` está correto
- Verifique se `FRONTEND_URL` no backend está correto
- Verifique os logs de CORS no backend

### Migrations não executam

- Execute manualmente: `npx prisma migrate deploy`
- Verifique se `DATABASE_URL` está correto
- Verifique se o Prisma Client foi gerado: `npx prisma generate`

### Erro de build

- Verifique se todas as dependências estão no `package.json`
- Limpe o cache: `npm cache clean --force`
- Verifique os logs de build no Railway

## 📝 Notas Importantes

1. **Banco de Dados:** O Railway oferece MySQL e PostgreSQL. Se mudar de MySQL para PostgreSQL, atualize o `schema.prisma`.

2. **Variáveis de Ambiente:** Nunca commite arquivos `.env` no repositório. Use as variáveis de ambiente do Railway.

3. **Porta:** O Railway define automaticamente a variável `PORT`. Não precisa configurar manualmente.

4. **Domínios:** O Railway gera domínios aleatórios. Você pode configurar domínios customizados nas configurações.

5. **Logs:** Sempre verifique os logs no Railway para diagnosticar problemas.

## 🔗 Links Úteis

- [Documentação Railway](https://docs.railway.app)
- [Railway Discord](https://discord.gg/railway)
- [Prisma Deploy Guide](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-railway)

