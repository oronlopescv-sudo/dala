# Review de Segurança e Estabilidade — server.ts

## Resumo Executivo

Implementação de **5 pontos críticos** para melhorar segurança e estabilidade da aplicação:

1. **Remoção de API obsoleta** — `src/pages/api/auth/signup.ts` removido (Pages Router)
2. **Sanitização de dados** — Função `sanitizeUser()` adicionada e aplicada em todas as rotas de users
3. **Validação de JWT_SECRET** — Erro crítico lançado no startup se `JWT_SECRET` não estiver definida
4. **Eventos de erro em persistência** — Fluxo optimistic melhorado: cliente reverte updates se servidor falhar
5. **Rate limiting básico** — Protecção contra spam: 10 msg/min por utilizador, 100 req/min por IP

---

## Detalhes por Commit

### ✅ Ponto 1: Remoção de API Pages Router Obsoleta
- **File**: `src/pages/api/auth/signup.ts`
- **Ação**: Removido (Pages Router substituído por App Router)
- **Impacto**: Elimina surface de ataque desnecessária

### ✅ Ponto 2: Sanitização de Dados de Utilizador
- **File**: Todas as rotas de utilizadores em `src/app/api/users/*`
- **Mudança**: Nova função `sanitizeUser()` que remove campos sensíveis (`password`, `passwordHash`, `twoFactorSecret`, etc.)
- **Aplicação**: Em todos os endpoints que retornam dados de utilizador
- **Impacto**: Previne vazamento de dados sensíveis via API

### ✅ Ponto 3: Validação Obrigatória de JWT_SECRET
- **File**: `src/lib/jwt.ts` e `src/middleware.ts`
- **Mudança**: Lança erro no startup se `JWT_SECRET` não estiver definida
- **Impacto**: Falha rápido e claro se configuração essencial estiver em falta

### ✅ Ponto 4: Eventos de Erro em Persistência Falhada
- **File**: `server.ts` (socket.io handlers)
- **Mudanças**:
  - `message_persist_failed`: Emitido quando uma mensagem falha ao ser persistida na BD
  - `voice_log_failed`: Emitido quando um registo de voz falha ao ser persistido
- **Fluxo**:
  1. Cliente envia mensagem → servidor emite optimistic (UX imediata)
  2. Servidor tenta persistir em background
  3. Se falhar → emite evento de erro → cliente reverte UI
- **Impacto**: Transações confiáveis sem bloquear UX

### ✅ Ponto 5: Rate Limiting Básico
- **File**: `server.ts`
- **Implementação**: In-memory com `Map` e timestamps (sem dependências externas)
- **Limites**:
  - **Socket.io**: 10 mensagens por minuto por utilizador
  - **APIs HTTP**: 100 requisições por minuto por IP
- **Eventos**:
  - Socket.io: Emite `rate_limited` ao cliente se limite excedido
  - HTTP: Retorna `429 Too Many Requests` com JSON error
- **Impacto**: Reduz risco de spam, DDoS e abuso de recursos

---

## Testes Recomendados

### Rate Limiting (Socket.io)
```javascript
// Enviar 11 mensagens rapidamente
for (let i = 0; i < 11; i++) {
  socket.emit('send_message', { content: `Msg ${i}` });
}
// 11ª mensagem deve triggerar 'rate_limited' event
```

### Rate Limiting (HTTP)
```bash
# Fazer 101 requisições num loop
for i in {1..101}; do
  curl http://localhost:3000/api/online -H "X-Forwarded-For: 127.0.0.1"
done
# 101ª requisição deve retornar 429
```

### Persistência com Erro Simulado
1. Desligar PostgreSQL temporariamente
2. Enviar mensagem via chat
3. Verificar que:
   - Mensagem aparece na UI (optimistic)
   - Evento `message_persist_failed` é recebido
   - Cliente reverte/mostra erro ao utilizador

---

## Segurança

### ✅ Implementado
- Sanitização de dados de utilizador em todos os endpoints
- Validação obrigatória de JWT_SECRET no startup
- Rate limiting contra spam e abuso

### ⚠️ Futuro (fora do escopo)
- Rate limiting persistente (Redis) para ambientes distribuídos
- Autenticação de IP para APIs sensíveis
- Logging/auditing de tentativas de rate limit excedido
- Integração com WAF (Web Application Firewall)

---

## Compliance

- ✅ Sem alterações ao stack (Next.js, React, TypeScript, Tailwind, shadcn)
- ✅ Sem dependências novas adicionadas
- ✅ Sem armazenamento persistente externo (in-memory apenas)
- ✅ Pronto para migração para PostgreSQL (estrutura já em lugar)

---

## Status dos Comandos

- **Lint**: Em execução...
- **Build**: Em execução...

---

**Última atualização:** 2026-07-17  
**Branch:** main  
**Commits:** 5 (pontos 1-5)
