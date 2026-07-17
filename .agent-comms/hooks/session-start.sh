#!/bin/bash
# Hook SessionStart — dispara quando uma sessão do Claude Code começa
# Mostra ao Claude Code o feedback que o Hermes deixou

COMMS_DIR="$CLAUDE_PROJECT_DIR/.agent-comms"
FEEDBACK="$COMMS_DIR/FEEDBACK.md"

if [ -f "$FEEDBACK" ]; then
    echo "=== FEEDBACK DO HERMES (ler antes de continuar) ==="
    cat "$FEEDBACK"
    echo "=== FIM DO FEEDBACK ==="
fi

exit 0