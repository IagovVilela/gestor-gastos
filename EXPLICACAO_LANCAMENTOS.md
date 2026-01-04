# 📋 Explicação: Lançamentos Futuros e Forma de Pagamento

## 🎯 O Problema que Resolve

Você mencionou 3 situações reais:
1. **"Van"** - Você registrou hoje, mas só vai pagar no dia 15
2. **"2 parcela celular"** e **"Suplementação-Whey"** - São da fatura do Nubank (crédito)
3. Você quer saber o que comprou com **crédito** e **débito**

---

## ✅ Como Funciona Agora

### 1. **Data de Lançamento vs Data de Pagamento**

**Antes:**
- Você tinha apenas 1 data: quando registrou a despesa
- O saldo era atualizado imediatamente

**Agora:**
- **Data do Lançamento** (`date`): Quando você registrou (ex: hoje, dia 3)
- **Data de Pagamento** (`paymentDate`): Quando será paga (ex: dia 15)
  - Se não informar, usa a mesma data do lançamento
  - Se informar uma data futura = **Lançamento Futuro**

**Exemplo:**
- Hoje é dia 3
- Você registra "Van" com data de pagamento dia 15
- ✅ A despesa aparece na lista
- ❌ O saldo NÃO é atualizado ainda (só atualiza no dia 15)

---

### 2. **Forma de Pagamento**

Agora você pode escolher:
- 💳 **CREDIT** (Cartão de Crédito)
- 💳 **DEBIT** (Cartão de Débito)
- 💵 **CASH** (Dinheiro)
- 📱 **PIX**
- 🏦 **BANK_TRANSFER** (Transferência)
- 📋 **OTHER** (Outros)

**Exemplo:**
- "2 parcela celular" → Forma: **CREDIT**
- "Suplementação-Whey" → Forma: **CREDIT**
- "Van" → Forma: **DEBIT** ou **PIX**

---

### 3. **Lógica de Atualização de Saldo**

O saldo do banco **SÓ é atualizado** quando:

✅ **Tem banco associado**  
✅ **Data de pagamento <= hoje** (não é futuro)  
✅ **Forma de pagamento NÃO é CREDIT** (crédito só afeta quando paga a fatura)

**Exemplos Práticos:**

#### Exemplo 1: Despesa Normal (Débito hoje)
- Descrição: "Supermercado"
- Data: Hoje (03/01)
- Data Pagamento: Hoje (03/01) - não informou, usa a mesma
- Forma: **DEBIT**
- Banco: Nubank
- **Resultado:** ✅ Saldo atualizado IMEDIATAMENTE (-R$ 200,00)

#### Exemplo 2: Lançamento Futuro
- Descrição: "Van"
- Data: Hoje (03/01)
- Data Pagamento: 15/01
- Forma: **DEBIT**
- Banco: Nubank
- **Resultado:** ❌ Saldo NÃO atualizado ainda (só atualiza no dia 15)

#### Exemplo 3: Compra no Crédito
- Descrição: "2 parcela celular"
- Data: Hoje (03/01)
- Data Pagamento: Hoje (03/01)
- Forma: **CREDIT**
- Banco: Nubank
- **Resultado:** ❌ Saldo NÃO atualizado (crédito só sai quando paga a fatura)

#### Exemplo 4: Compra no Crédito que será paga no futuro
- Descrição: "Suplementação-Whey"
- Data: Hoje (03/01)
- Data Pagamento: 10/01 (quando a fatura vence)
- Forma: **CREDIT**
- Banco: Nubank
- **Resultado:** ❌ Saldo NÃO atualizado (só atualiza quando pagar a fatura no dia 10)

---

## 🔍 Como Você Vai Usar

### Ao Registrar uma Despesa:

1. **Despesa Normal (paga hoje com débito):**
   - Preenche normalmente
   - Forma: DEBIT
   - Saldo atualiza na hora

2. **Lançamento Futuro (Van dia 15):**
   - Data: Hoje
   - **Data de Pagamento: 15/01** ← Aqui você informa
   - Forma: DEBIT ou PIX
   - Saldo só atualiza no dia 15

3. **Compra no Crédito:**
   - Data: Hoje
   - Forma: **CREDIT** ← Aqui você marca
   - Saldo NÃO atualiza (só quando pagar a fatura)

4. **Fatura do Cartão (que você vai pagar):**
   - Data: Hoje
   - **Data de Pagamento: 10/01** (quando vence a fatura)
   - Forma: **CREDIT**
   - Saldo só atualiza quando você pagar a fatura no dia 10

---

## 📊 Visualizações

### Na Lista de Despesas:
- Badge **"Futuro"** quando `paymentDate > hoje`
- Badge **"Crédito"** quando `paymentMethod = CREDIT`
- Mostra a forma de pagamento

### Filtros:
- "Apenas Lançamentos Futuros"
- "Apenas Crédito"
- "Apenas Débito"
- etc.

### Dashboard:
- Seção "Lançamentos Futuros" (o que você vai pagar)
- Relatório "Compras no Crédito"
- Relatório "Compras no Débito"

---

## 💡 Resumo Simples

**Antes:** Tudo atualizava o saldo na hora

**Agora:**
- ✅ Despesa normal (débito hoje) → Atualiza saldo
- ⏰ Lançamento futuro → NÃO atualiza até a data
- 💳 Crédito → NÃO atualiza até pagar a fatura
- 📊 Você vê tudo, mas o saldo só muda quando realmente sai do banco

---

## ❓ Dúvidas Comuns

**P: Se eu comprar no crédito hoje, quando o saldo atualiza?**  
R: Só quando você pagar a fatura. Se a fatura vence dia 10, coloque "Data de Pagamento: 10/01" e forma "CREDIT". O saldo só atualiza no dia 10.

**P: E se eu quiser que o saldo atualize mesmo sendo crédito?**  
R: Não recomendado, mas você pode usar forma "DEBIT" mesmo sendo crédito. O ideal é usar "CREDIT" para ter controle real.

**P: Como vejo só as compras no crédito?**  
R: Use o filtro "Apenas Crédito" na lista de despesas.

**P: Como vejo o que tenho que pagar no futuro?**  
R: Use o filtro "Lançamentos Futuros" ou veja no Dashboard.

---

## 🎯 Seus Casos de Uso

1. **"Van" (paga dia 15):**
   - Data: Hoje
   - Data Pagamento: 15/01
   - Forma: DEBIT
   - ✅ Aparece na lista, mas saldo só atualiza dia 15

2. **"2 parcela celular" (fatura Nubank):**
   - Data: Hoje
   - Data Pagamento: Hoje (ou quando vence a fatura)
   - Forma: **CREDIT**
   - ✅ Aparece na lista, saldo só atualiza quando pagar a fatura

3. **"Suplementação-Whey" (fatura Nubank):**
   - Data: Hoje
   - Data Pagamento: Hoje (ou quando vence a fatura)
   - Forma: **CREDIT**
   - ✅ Aparece na lista, saldo só atualiza quando pagar a fatura

---

**Faz sentido agora?** Se tiver dúvidas, me fale! 😊

