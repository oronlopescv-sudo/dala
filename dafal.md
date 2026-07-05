Prompt atualizado. Incluída paleta verde e amarela, regras estritas de design móvel (PWA, toque sem atraso) e tratamento de desbloqueio de áudio para iOS/Android.

```markdown
Aja como um Designer e Engenheiro Mobile Senior especialista em Next.js, WebSockets (Socket.io), Web Audio e MongoDB. Crie o código completo do app de Walkie-Talkie "Da Fala". O app será usado EXCLUSIVAMENTE em telefones celulares (Mobile-only).

### Identidade Visual e Cores (Verde e Amarelo):
- Use Tailwind CSS com paleta moderna e harmoniosa baseada em tons de verde e amarelo.
- Fundo: Verde escuro profundo (ex: `bg-emerald-950` ou `bg-green-950`) para economia de bateria e conforto visual.
- Destaques e Botão PTT: Amarelo vibrante/âmbar (ex: `bg-yellow-400` ou `bg-amber-400`) para alta visibilidade.
- Status Ativos: Verde lima vibrante (ex: `bg-lime-500`) para indicar "online" ou "falando".
- Estilo: Glassmorphic premium (bordas sutis, blur de fundo) adaptado para telas móveis.

### Otimização Estrita para Celular (Mobile-First / Touch-First):
1. **Layout PWA:** 
   - Altura total dinâmica (`h-[100dvh]`) para evitar problemas de barra de navegação do navegador móvel.
   - Desabilitar scroll padrão (`overflow-hidden`) e impedir zoom de pinça no toque.
   - Prevenir o efeito de rebote (bounce scroll) comum no iOS Safari.
2. **Interface de Toque:**
   - Botão PTT gigante, centralizado, fácil de pressionar com o polegar.
   - Eventos `onTouchStart` e `onTouchEnd` otimizados com `preventDefault()` para evitar atraso de 300ms de clique no celular.
   - Vibração tátil no celular via `navigator.vibrate` quando o botão PTT for pressionado ou liberado.
3. **Desbloqueio de Áudio:**
   - Implementar fluxo para desbloquear o `AudioContext` do navegador no primeiro toque (obrigatório para iOS Safari reproduzir som sem interação direta prévia).
   - Gerenciar foco do app: pausar/retomar gravação se o usuário receber uma ligação telefônica ou minimizar o app.

### Requisitos Técnicos de Áudio e Banco de Dados (Da Fala):
- **Áudio:** Gravação com codec de baixa taxa de bits (Opus) via Socket.io para rodar bem mesmo em redes 3G/4G oscilantes.
- **MongoDB:** Gravar canais criados, lista de usuários online por canal e histórico de logs rápidos de uso ("Quem falou e quando").
- **WebSocket:** Canal bidirecional de baixa latência.

### Estrutura de Arquivos Requerida:
Forneça o código completo e integrado para:
1. `server.js` - Servidor Socket.io tratando conexões mobile de áudio.
2. `lib/db.ts` - Conexão Mongoose singleton.
3. `models/Channel.ts` - Schema do canal e logs de voz.
4. `components/WalkieTalkieApp.tsx` - Interface principal PTT otimizada para toque móvel, com esquema de cores verde/amarelo, indicador de quem fala, visualizador de áudio e lista de membros do canal.
5. `app/page.tsx` - Carrega o app principal com validação de suporte a áudio no dispositivo móvel do usuário.
```

Próximo passo: colar no gerador de IA.