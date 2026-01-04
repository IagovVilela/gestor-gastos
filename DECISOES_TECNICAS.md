# Decisões Técnicas

Documentação de decisões importantes sobre arquitetura, padrões, tecnologias e abordagens.

---

## Formato de Decisão

```
### [ID] - [Título da Decisão]

**Data:** [DD/MM/YYYY]

**Contexto:**
[Contexto que levou a esta decisão]

**Decisão:**
[Qual foi a decisão tomada]

**Alternativas Consideradas:**
1. [Alternativa 1] - [Por que foi descartada]
2. [Alternativa 2] - [Por que foi descartada]

**Consequências:**
- [Impacto positivo]
- [Impacto negativo ou limitação]

**Status:** [Proposta | Aprovada | Implementada | Revisada]

---
```

---

## Histórico de Decisões

---

### DT-001 - Estrutura de Projeto: Monorepo vs Repositórios Separados

**Data:** 01/01/2025

**Contexto:**
Necessidade de decidir como organizar o código do frontend e backend - se em um único repositório (monorepo) ou em repositórios separados.

**Decisão:**
Utilizar estrutura de **repositório único com pastas separadas** (backend/ e frontend/), mas não um monorepo completo com workspace management. Esta abordagem oferece:
- Facilidade de desenvolvimento local
- Compartilhamento de tipos TypeScript (se necessário)
- Versionamento unificado
- Simplicidade de setup inicial

**Alternativas Consideradas:**
1. **Monorepo completo (Nx, Turborepo)** - Descartada por complexidade desnecessária para este projeto
2. **Repositórios completamente separados** - Descartada por dificultar desenvolvimento e manutenção sincronizada

**Consequências:**
- ✅ Facilita desenvolvimento e manutenção
- ✅ Permite compartilhamento de código/types se necessário
- ⚠️ Requer cuidado com paths e configurações de build

**Status:** Aprovada

---

### DT-002 - Arquitetura Backend: NestJS com Camadas

**Data:** 01/01/2025

**Contexto:**
Definir a arquitetura do backend para garantir código limpo, modular e escalável.

**Decisão:**
Utilizar **arquitetura em camadas** com NestJS:
- **Controllers**: Recebem requisições HTTP, validam DTOs, chamam services
- **Services**: Contêm lógica de negócio, orquestram operações
- **Repositories**: Acesso a dados via Prisma, abstração do banco
- **DTOs**: Validação e transformação de dados
- **Guards**: Proteção de rotas e autenticação
- **Interceptors**: Transformação de respostas, logging

**Alternativas Consideradas:**
1. **Arquitetura monolítica simples** - Descartada por falta de separação de responsabilidades
2. **DDD (Domain-Driven Design)** - Descartada por complexidade excessiva para o escopo inicial

**Consequências:**
- ✅ Código organizado e testável
- ✅ Fácil manutenção e evolução
- ✅ Separação clara de responsabilidades
- ⚠️ Mais arquivos e estrutura inicial mais complexa

**Status:** Aprovada

---

### DT-003 - Gerenciamento de Estado Frontend: Zustand

**Data:** 01/01/2025

**Contexto:**
Escolher a solução de gerenciamento de estado para o frontend React.

**Decisão:**
Utilizar **Zustand** ao invés de Redux ou Context API puro.

**Alternativas Consideradas:**
1. **Redux Toolkit** - Descartada por complexidade e boilerplate excessivo para este projeto
2. **Context API + useReducer** - Descartada por performance e complexidade de gerenciamento
3. **Jotai/Recoil** - Descartadas por menor adoção e documentação

**Consequências:**
- ✅ API simples e intuitiva
- ✅ Menos boilerplate que Redux
- ✅ Performance otimizada
- ✅ Fácil integração com TypeScript
- ✅ Tamanho pequeno da biblioteca

**Status:** Aprovada

---

### DT-004 - Biblioteca de Gráficos: Recharts

**Data:** 01/01/2025

**Contexto:**
Escolher biblioteca para renderização de gráficos no dashboard.

**Decisão:**
Utilizar **Recharts** ao invés de Chart.js.

**Alternativas Consideradas:**
1. **Chart.js** - Descartada por menor integração nativa com React e necessidade de wrappers
2. **Victory** - Descartada por API menos intuitiva
3. **D3.js direto** - Descartada por complexidade e curva de aprendizado

**Consequências:**
- ✅ Integração nativa com React
- ✅ API declarativa e intuitiva
- ✅ Boa documentação
- ✅ Customização flexível
- ✅ TypeScript support

**Status:** Aprovada

---

### DT-005 - ORM: Prisma

**Data:** 01/01/2025

**Contexto:**
Escolher ORM para gerenciamento do banco de dados PostgreSQL.

**Decisão:**
Utilizar **Prisma ORM** ao invés de TypeORM ou Sequelize.

**Alternativas Consideradas:**
1. **TypeORM** - Descartada por API menos intuitiva e problemas com decorators
2. **Sequelize** - Descartada por menor suporte a TypeScript e sintaxe menos moderna
3. **Knex.js (query builder)** - Descartada por falta de type-safety nativo

**Consequências:**
- ✅ Type-safety completo
- ✅ Migrations automáticas
- ✅ Prisma Studio (GUI para dados)
- ✅ Performance otimizada
- ✅ Excelente suporte a TypeScript
- ✅ API moderna e intuitiva

**Status:** Aprovada

---

### DT-006 - Autenticação: JWT com Refresh Tokens

**Data:** 01/01/2025

**Contexto:**
Definir estratégia de autenticação segura e moderna.

**Decisão:**
Implementar **JWT (JSON Web Tokens)** com:
- **Access Token**: Curta duração (15-30 min), contém dados do usuário
- **Refresh Token**: Longa duração (7-30 dias), armazenado em httpOnly cookie ou banco
- **Rotação de tokens**: Refresh token é renovado a cada uso

**Alternativas Consideradas:**
1. **Sessões tradicionais** - Descartada por não ser stateless e dificultar escalabilidade
2. **JWT apenas (sem refresh)** - Descartada por questões de segurança (tokens não podem ser revogados facilmente)
3. **OAuth2 completo** - Descartada por complexidade desnecessária para aplicação single-tenant

**Consequências:**
- ✅ Stateless (escalável)
- ✅ Seguro com refresh tokens
- ✅ Boa experiência do usuário (não precisa relogar frequentemente)
- ⚠️ Requer implementação cuidadosa de revogação de tokens

**Status:** Aprovada

---

### DT-007 - UI Components: shadcn/ui

**Data:** 01/01/2025

**Contexto:**
Escolher biblioteca de componentes UI para acelerar desenvolvimento.

**Decisão:**
Utilizar **shadcn/ui** ao invés de Material-UI, Chakra UI ou Ant Design.

**Alternativas Consideradas:**
1. **Material-UI (MUI)** - Descartada por design muito característico e difícil customização
2. **Chakra UI** - Descartada por menor flexibilidade de design
3. **Ant Design** - Descartada por design muito específico e bundle size grande
4. **Radix UI + Tailwind** - Similar ao shadcn, mas shadcn já vem com componentes prontos

**Consequências:**
- ✅ Componentes copiados no projeto (não dependência)
- ✅ Total controle e customização
- ✅ Baseado em Radix UI (acessibilidade)
- ✅ Integração perfeita com Tailwind CSS
- ✅ Design moderno e minimalista
- ✅ TypeScript nativo

**Status:** Aprovada

---

### DT-008 - Banco de Dados: MySQL

**Data:** 01/01/2025

**Contexto:**
Necessidade de escolher o banco de dados relacional para o sistema. Inicialmente estava planejado usar PostgreSQL, mas o usuário solicitou MySQL.

**Decisão:**
Utilizar **MySQL** como banco de dados relacional ao invés de PostgreSQL.

**Alternativas Consideradas:**
1. **PostgreSQL** - Foi a escolha inicial, mas alterada conforme solicitação do usuário
2. **SQLite** - Descartada por não ser adequada para aplicação web com múltiplos usuários
3. **MongoDB** - Descartada por ser NoSQL e não atender aos requisitos relacionais do projeto

**Consequências:**
- ✅ MySQL é amplamente utilizado e bem suportado pelo Prisma
- ✅ Boa performance para aplicações web
- ✅ Fácil de configurar e manter
- ✅ Compatível com Prisma ORM
- ✅ Suporte a transações e relacionamentos
- ⚠️ Algumas diferenças de sintaxe em relação ao PostgreSQL (mas Prisma abstrai isso)

**Status:** Implementada

---

