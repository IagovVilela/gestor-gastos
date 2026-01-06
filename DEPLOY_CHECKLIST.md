# ✅ Checklist de Deploy no Railway

Use este checklist para garantir que tudo está configurado corretamente antes do deploy.

## 📦 Preparação

- [ ] Repositório Git configurado e código commitado
- [ ] Conta Railway criada e projeto inicializado
- [ ] Arquivos de configuração criados (`railway.json`, `.railwayignore`)

## 🗄️ Banco de Dados

- [ ] Serviço MySQL/PostgreSQL criado no Railway
- [ ] URL de conexão (`DATABASE_URL`) anotada
- [ ] Schema Prisma verificado (MySQL ou PostgreSQL)

## 🔧 Backend

- [ ] Serviço backend criado no Railway
- [ ] Root directory configurado: `backend`
- [ ] Build command: `npm install && npm run build && npx prisma generate`
- [ ] Start command: `npm run start:prod`
- [ ] Variáveis de ambiente configuradas:
  - [ ] `DATABASE_URL`
  - [ ] `JWT_SECRET` (valor seguro gerado)
  - [ ] `JWT_REFRESH_SECRET` (valor seguro gerado)
  - [ ] `JWT_EXPIRES_IN="15m"`
  - [ ] `JWT_REFRESH_EXPIRES_IN="7d"`
  - [ ] `NODE_ENV="production"`
  - [ ] `PORT` (gerenciado automaticamente pelo Railway)
  - [ ] `FRONTEND_URL` (será atualizado após deploy do frontend)

## 🎨 Frontend

- [ ] Serviço frontend criado no Railway
- [ ] Root directory configurado: `frontend`
- [ ] Build command: `npm install && npm run build`
- [ ] Start command: `npm run start`
- [ ] Variáveis de ambiente configuradas:
  - [ ] `NEXT_PUBLIC_API_URL` (URL do backend)

## 🔄 Pós-Deploy

- [ ] Backend deployado com sucesso
- [ ] Migrations executadas (`npx prisma migrate deploy`)
- [ ] Frontend deployado com sucesso
- [ ] Domínio do frontend gerado/anotado
- [ ] `FRONTEND_URL` atualizado no backend
- [ ] Backend reiniciado após atualizar `FRONTEND_URL`

## ✅ Testes

- [ ] Frontend acessível via URL do Railway
- [ ] Backend acessível e respondendo
- [ ] Swagger acessível: `https://seu-backend.railway.app/api`
- [ ] Página de login carrega
- [ ] Cadastro de usuário funciona
- [ ] Login funciona
- [ ] Dashboard carrega após login
- [ ] Requisições API funcionando
- [ ] CORS configurado corretamente

## 🔐 Segurança

- [ ] Secrets JWT são seguros e únicos
- [ ] Variáveis de ambiente não estão no código
- [ ] `.env` não está commitado no Git
- [ ] CORS configurado apenas para o frontend correto

## 📝 Documentação

- [ ] URLs de produção anotadas
- [ ] Credenciais de acesso seguras
- [ ] Documentação de deploy atualizada

## 🎯 Próximos Passos (Opcional)

- [ ] Configurar domínio customizado
- [ ] Configurar volume para uploads persistentes
- [ ] Configurar monitoramento/logs
- [ ] Configurar backup do banco de dados
- [ ] Configurar CI/CD para deploy automático



