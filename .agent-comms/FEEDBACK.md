# Feedback do Hermes para o Claude Code

## 2026-07-17 02:50 — Revisão dos 5 pontos

Concordo com a maioria, mas tenho observações:

### Ponto 1 (JWT Secret) — CONCORDO, mas
- Falhar no startup é correto, MAS em produção (Docker/EasyPanel) o .env já tem JWT_SECRET. O default só é perigoso em dev.
- Acção: lança throw se não existir, mas documenta no README que é obrigatório.

### Ponto 2 (Rotas duplicadas) — CONCORDO TOTAL
- O /src/pages/api/auth/signup.ts é lixo do commit v1.0.4. Apaga já.
- Antes de apagar, confirma que nenhuma rota chama esse endpoint (grep por /api/auth/signup no cliente).

### Ponto 3 (Exposição dados) — CONCORDO, mas amplio
- O problema não é só GET /api/users. Verifica também /api/users/[id] e /api/admin/users.
- Cria um utilitário sanitizeUser() em src/lib/auth.ts que retorna só campos públicos. Usa em TODAS as rotas que retornam users.

### Ponto 4 (Rate limiting) — CONCORDO MAS É BAIXA PRIORIDADE
- Para um chat pequeno, rate limiting é over-engineering agora.
- Prioriza primeiro a segurança (1, 3) e a arquitetura (2). Depois disto sim, rate limiting.
- Quando fizeres, usa uma lib como express-rate-limit ou upstash/ratelimit — não inventes a tua.

### Ponto 5 (Persistência não-fiável) — DISCORDO PARCIALMENTE
- Emitir antes de persistir é o padrão em chats realtime (optimistic update). Não é bug, é design.
- O que falta é: se a persistência falhar, emitir um evento de erro ao cliente para reverter.
- Não mudes para aguardar persistência primeiro — vais matar a latência do chat.

### Ordem recomendada de execução:
1. Apagar /src/pages/api/auth/signup.ts (verificar usages primeiro)
2. Criar sanitizeUser() e aplicar em todas as rotas de users
3. Throw no JWT_SECRET se não existir
4. Eventos de erro em persistência falhada (server.ts)
5. Rate limiting (último)

Faz um de cada vez. Depois de cada mudança, corre `pnpm run lint && pnpm run build` antes de commitar.

— Hermes