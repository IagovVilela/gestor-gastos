# Backend - Gestão de Gastos Pessoais

API REST desenvolvida com NestJS para o sistema de gestão de gastos pessoais.

## 🚀 Como executar

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar variáveis de ambiente
Crie um arquivo `.env` na raiz do backend com:
```env
DATABASE_URL="mysql://user:password@localhost:3306/gestao_gastos"
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="your-super-secret-refresh-key"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=3001
NODE_ENV=development
FRONTEND_URL="http://localhost:3000"
```

### 3. Configurar banco de dados
```bash
# Gerar Prisma Client
npm run prisma:generate

# Executar migrations
npm run prisma:migrate
```

### 4. Executar em desenvolvimento
```bash
npm run start:dev
```

## 📚 Documentação da API

Após iniciar o servidor, acesse:
- Swagger: http://localhost:3001/api

## 🛠️ Scripts disponíveis

- `npm run start:dev` - Inicia em modo desenvolvimento
- `npm run build` - Compila o projeto
- `npm run start:prod` - Inicia em modo produção
- `npm run prisma:generate` - Gera o Prisma Client
- `npm run prisma:migrate` - Executa migrations
- `npm run prisma:studio` - Abre o Prisma Studio
- `npm run lint` - Executa o linter
- `npm run test` - Executa testes

