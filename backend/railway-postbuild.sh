#!/bin/bash
# Script executado após o build no Railway
# Gera o Prisma Client e executa migrations

echo "🔧 Gerando Prisma Client..."
npx prisma generate

echo "📦 Executando migrations..."
npx prisma migrate deploy

echo "✅ Post-build concluído!"


