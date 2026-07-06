# Dockerfile determinístico para o EasyPanel (Da Fala)
FROM node:20-slim

WORKDIR /app

# Prisma precisa de openssl
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

ENV NEXT_TELEMETRY_DISABLED=1

# 1) Copia só o manifesto + schema para cachear a instalação de dependências.
#    Assim, se só o código mudar, o `npm install` NÃO volta a correr (build rápido).
COPY package*.json ./
COPY prisma ./prisma
RUN npm install

# 2) Copia o resto do código e faz o build de produção.
COPY . .
RUN npm run build

EXPOSE 3000
ENV NODE_ENV=production

# Ao arrancar: tenta aplicar o schema à BD (não bloqueia se falhar) e sobe o servidor.
# O EasyPanel injeta PORT=80, por isso o servidor escuta na 80 (domínio aponta para 80).
CMD ["sh", "-c", "echo '>> prisma db push...'; npx prisma db push --accept-data-loss || echo '>> AVISO: prisma db push falhou, a continuar'; echo '>> a iniciar servidor'; npx tsx server.ts"]
