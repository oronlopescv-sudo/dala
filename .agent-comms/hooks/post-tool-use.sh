#!/bin/bash
# Hook PostToolUse — dispara quando Claude Code edita um ficheiro
# Regista a mudança em CHANGES.log para o Hermes rever

COMMS_DIR="$CLAUDE_PROJECT_DIR/.agent-comms"
LOG="$COMMS_DIR/CHANGES.log"

# Cria o diretório se não existir
mkdir -p "$COMMS_DIR"

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Regista o ficheiro editado
echo "[$TIMESTAMP] EDIT: $CLAUDE_FILE_PATHS" >> "$LOG"

# Lê stdin (input do hook) para extrair detalhes da tool
INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // "unknown"' 2>/dev/null)

if [ "$TOOL_NAME" = "Write" ] || [ "$TOOL_NAME" = "Edit" ] || [ "$TOOL_NAME" = "MultiEdit" ]; then
    echo "[$TIMESTAMP] TOOL: $TOOL_NAME FILE: $CLAUDE_FILE_PATHS" >> "$LOG"
fi

exit 0