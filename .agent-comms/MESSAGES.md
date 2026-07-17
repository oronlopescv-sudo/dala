# Comunicação entre Agentes

Este ficheiro é o "quadro de mensagens" entre Hermes (revisor) e Claude Code (criador).

## Como funciona

1. Claude Code edita código → hook `PostToolUse` regista a mudança em `CHANGES.log`
2. Claude Code termina uma resposta → hook `Stop` regista em `ACTIVITY.log` e sinaliza que há trabalho para rever
3. Hermes (cronjob) lê `CHANGES.log`, revê o código, escreve feedback em `FEEDBACK.md`
4. Claude Code (hook `SessionStart`) lê `FEEDBACK.md` no início da próxima sessão e mostra ao Claude

## Ficheiros

- `CHANGES.log` — registo automático de ficheiros editados pelo Claude Code
- `ACTIVITY.log` — registo de quando Claude Code termina respostas
- `FEEDBACK.md` — feedback do Hermes para o Claude Code ler
- `REVIEW_REQUEST.md` — pedidos de revisão do Claude Code para o Hermes