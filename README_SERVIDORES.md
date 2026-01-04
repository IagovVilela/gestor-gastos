# 🚀 Guia de Inicialização dos Servidores

## Problema Resolvido

Anteriormente, os servidores (frontend e backend) caíam sempre que havia alterações nos arquivos. Isso foi resolvido com:

1. **Configuração de polling no Next.js** - Melhora o hot reload no Windows
2. **Scripts de gerenciamento** - Garantem que os servidores continuem rodando
3. **Monitoramento automático** - Reinicia servidores se pararem

## 🎯 Forma Recomendada de Iniciar

### Opção 1: Script Automático (Recomendado)

Execute o script que inicia ambos os servidores:

```powershell
.\iniciar-servidores.ps1
```

**Vantagens:**
- ✅ Inicia backend e frontend automaticamente
- ✅ Monitora e reinicia se algum servidor cair
- ✅ Limpa processos anteriores automaticamente
- ✅ Mostra status e URLs dos servidores

### Opção 2: Manual (Terminais Separados)

Se preferir ver os logs separadamente:

**Terminal 1 - Backend:**
```powershell
cd backend
npm run start:dev
```

**Terminal 2 - Frontend:**
```powershell
cd frontend
npm run dev
```

## 🛑 Parar os Servidores

### Usando o Script:
```powershell
.\parar-servidores.ps1
```

### Manualmente:
- Pressione `Ctrl+C` em cada terminal
- Ou execute:
```powershell
Get-Process -Name node | Stop-Process -Force
```

## 🔧 Configurações Aplicadas

### Frontend (next.config.js)
- **Polling habilitado**: Verifica mudanças a cada 1 segundo
- **Aggregate timeout**: Aguarda 300ms antes de recompilar
- **On-demand entries**: Configurado para melhor performance

### Backend (nest-cli.json)
- **Watch mode**: Já configurado por padrão no NestJS
- **Hot reload**: Funciona automaticamente com `start:dev`

## 📊 URLs dos Servidores

Após iniciar, os servidores estarão disponíveis em:

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3001
- **Swagger (API Docs)**: http://localhost:3001/api

## ⚠️ Troubleshooting

### Servidor não inicia

1. **Verifique se as portas estão livres:**
```powershell
Get-NetTCPConnection -LocalPort 3000,3001
```

2. **Limpe processos anteriores:**
```powershell
.\parar-servidores.ps1
```

3. **Verifique se o MySQL está rodando:**
   - Abra o XAMPP Control Panel
   - Certifique-se de que o MySQL está verde (rodando)

4. **Limpe cache do Next.js:**
```powershell
cd frontend
Remove-Item -Recurse -Force .next
npm run dev
```

### Hot Reload não funciona

1. **Verifique o next.config.js:**
   - Deve ter `poll: 1000` configurado
   - Se não tiver, o script já aplicou a correção

2. **Reinicie os servidores:**
```powershell
.\parar-servidores.ps1
.\iniciar-servidores.ps1
```

### Servidor cai após alterações

1. **Use o script de inicialização:**
   - Ele monitora e reinicia automaticamente

2. **Verifique os logs:**
   - O script mostra os logs de cada servidor
   - Procure por erros de compilação

## 💡 Dicas

1. **Sempre use o script `iniciar-servidores.ps1`** para garantir estabilidade
2. **Mantenha o MySQL rodando** antes de iniciar o backend
3. **Aguarde a compilação inicial** (pode levar 30-60 segundos)
4. **Não feche o terminal** onde o script está rodando

## 🔄 Fluxo de Desenvolvimento

1. Inicie os servidores: `.\iniciar-servidores.ps1`
2. Faça suas alterações nos arquivos
3. Os servidores detectam automaticamente e recompilam
4. A página no navegador atualiza automaticamente (hot reload)
5. Se algo der errado, o script reinicia automaticamente

---

**✅ Com essas configurações, os servidores devem permanecer estáveis mesmo com alterações!**

