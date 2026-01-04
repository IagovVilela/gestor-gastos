# 💰 Sistema de Gestão de Gastos Pessoais

Sistema web completo para gestão de gastos pessoais, desenvolvido com tecnologias modernas.

## 🛠️ Stack Tecnológica

### Frontend
- **Next.js 14+** - Framework React com App Router
- **React 18+** - Biblioteca UI
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização utilitária
- **shadcn/ui** - Componentes UI modernos
- **Framer Motion** - Animações
- **Zustand** - Gerenciamento de estado
- **Axios** - Cliente HTTP
- **Recharts** - Gráficos e visualizações

### Backend
- **Node.js 18+** - Runtime JavaScript
- **NestJS** - Framework Node.js
- **TypeScript** - Tipagem estática
- **Prisma ORM** - ORM para banco de dados
- **MySQL** - Banco de dados relacional
- **JWT** - Autenticação via tokens
- **Swagger** - Documentação da API

## 📁 Estrutura do Projeto

```
projeto/
├── backend/          # Aplicação NestJS
├── frontend/         # Aplicação Next.js
└── docs/             # Documentação
```

## 🚀 Instalação e Execução

### Pré-requisitos

- Node.js 18+ instalado
- MySQL instalado e rodando (XAMPP ou similar)
- npm ou yarn
- PowerShell (Windows)

### ⚡ Início Rápido (Recomendado)

**Para iniciar ambos os servidores automaticamente:**

```powershell
.\iniciar-servidores.ps1
```

Este script:
- ✅ Inicia backend e frontend automaticamente
- ✅ Abre cada servidor em uma janela separada
- ✅ Configura hot reload para detectar alterações
- ✅ Garante que os servidores continuem rodando mesmo com mudanças

**Para parar os servidores:**

```powershell
.\parar-servidores.ps1
```

📖 **Consulte `README_SERVIDORES.md` para mais detalhes sobre os scripts.**

---

### 📦 Instalação Manual

#### Backend

1. Entre na pasta do backend:
```bash
cd backend
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
# Copie o arquivo .env.example e configure
# DATABASE_URL="mysql://user:password@localhost:3306/gestao_gastos"
# JWT_SECRET="your-secret-key"
# JWT_REFRESH_SECRET="your-refresh-secret-key"
```

4. Configure o banco de dados:
```bash
# Gere o Prisma Client
npm run prisma:generate

# Execute as migrations
npm run prisma:migrate
```

5. Inicie o servidor:
```bash
npm run start:dev
```

O backend estará rodando em `http://localhost:3001`
A documentação Swagger estará em `http://localhost:3001/api`

#### Frontend

1. Entre na pasta do frontend:
```bash
cd frontend
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente (opcional):
```bash
# Crie um arquivo .env.local se necessário
# NEXT_PUBLIC_API_URL=http://localhost:3001
```

4. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

O frontend estará rodando em `http://localhost:3000`

---

### 🔧 Configurações de Hot Reload

O sistema está configurado para **não cair** quando há alterações:

- **Frontend**: Polling habilitado no `next.config.js` (verifica mudanças a cada 1 segundo)
- **Backend**: Watch mode ativo por padrão no NestJS
- **Scripts**: Gerenciamento automático de processos

**Se os servidores ainda caírem:**
1. Use o script `iniciar-servidores.ps1` (mais estável)
2. Verifique se o MySQL está rodando
3. Consulte `README_SERVIDORES.md` para troubleshooting

## 📚 Documentação

Consulte os arquivos na pasta `docs/` para documentação detalhada:
- `DOCUMENTACAO.md` - Documentação geral
- `PLANEJAMENTO.md` - Planejamento de tarefas
- `LOG_IMPLEMENTACOES.md` - Log de implementações
- `DECISOES_TECNICAS.md` - Decisões técnicas

## 🔄 Status do Projeto

✅ **Todas as Fases Principais Concluídas!**

- ✅ FASE 1-3: Estrutura Base e Configuração
- ✅ FASE 4: Banco de Dados (MySQL + Prisma)
- ✅ FASE 5: Autenticação Backend (JWT)
- ✅ FASE 6: Módulos Core Backend
- ✅ FASE 7: Autenticação Frontend
- ✅ FASE 8: Layout Principal
- ✅ FASE 9: Dashboard Completo
- ✅ FASE 10: CRUD Receitas/Despesas
- ✅ FASE 11: Categorias e Metas
- ✅ FASE 12: Animações e UX
- ✅ **Melhorias: Scripts de Gerenciamento de Servidores**

## 🎯 URLs do Sistema

Após iniciar os servidores:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Swagger (Documentação)**: http://localhost:3001/api

## 📝 Licença

MIT
