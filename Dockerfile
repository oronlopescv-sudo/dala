# Dockerfile determinístico para o EasyPanel (Da Fala)
FROM node:20-slim

WORKDIR /app

# Prisma precisa de openssl
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

ENV NEXT_TELEMETRY_DISABLED=1

# Copia tudo (schema.prisma tem de existir para o postinstall gerar o cliente)
COPY . .

# Instala TODAS as dependências (dev incluídas) para conseguir compilar.
# O postinstall corre `prisma generate`.
RUN npm install

# Build de produção (prisma generate + next build)
RUN npm run build

EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Ao arrancar: aplica o schema à BD e sobe o servidor Next + Socket.io
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npx tsx server.ts"]
