#!/bin/bash
# Hook Stop — dispara quando Claude Code termina uma resposta
# Sinaliza ao Hermes que há trabalho novo para rever

COMMS_DIR="$CLAUDE_PROJECT_DIR/.agent-comms"
LOG="$COMMS_DIR/ACTIVITY.log"
REVIEW_FLAG="$COMMS_DIR/REVIEW_PENDING"

mkdir -p "$COMMS_DIR"

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Regista que o Claude Code terminou
echo "[$TIMESTAMP] STOP: Claude Code terminou uma resposta" >> "$LOG"

# Levanta a flag de revisão pendente
echo "$TIMESTAMP" > "$REVIEW_FLAG"

exit 0