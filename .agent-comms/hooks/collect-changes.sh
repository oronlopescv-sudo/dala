#!/bin/bash
# Script que o cronjob do Hermes executa para revisar as mudanças do Claude Code
# Lê CHANGES.log, revê o diff do git, e escreve feedback em FEEDBACK.md

COMMS_DIR="$1"
if [ -z "$COMMS_DIR" ]; then
    COMMS_DIR="$(pwd)/.agent-comms"
fi

CHANGES_LOG="$COMMS_DIR/CHANGES.log"
FEEDBACK="$COMMS_DIR/FEEDBACK.md"
REVIEW_FLAG="$COMMS_DIR/REVIEW_PENDING"

# Se não há flag de revisão pendente, sai silenciosamente
if [ ! -f "$REVIEW_FLAG" ]; then
    exit 0
fi

# Lê a flag para saber desde quando rever
SINCE=$(cat "$REVIEW_FLAG")

# Recolhe o diff do git desde a última revisão
cd "$COMMS_DIR/.."
DIFF=$(git diff HEAD 2>/dev/null)
STATS=$(git diff --stat HEAD 2>/dev/null)

# Conta as mudanças no log desde o timestamp
NEW_CHANGES=$(awk -v since="$SINCE" '$0 > since' "$CHANGES_LOG" 2>/dev/null | wc -l | tr -d ' ')

# Remove a flag de pendente
rm -f "$REVIEW_FLAG"

# Se não há mudanças novas, sai silenciosamente
if [ "$NEW_CHANGES" -eq 0 ] && [ -z "$DIFF" ]; then
    exit 0
fi

# Escreve um resumo para o Hermes processar
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
cat > "$COMMS_DIR/PENDING_REVIEW.txt" <<EOF
TIMESTAMP: $TIMESTAMP
CHANGES_SINCE: $SINCE
NEW_EDITS: $NEW_CHANGES

=== GIT DIFF STAT ===
$STATS

=== CHANGES LOG (recentes) ===
tail -20 "$CHANGES_LOG"

=== GIT DIFF ===
$DIFF
EOF

echo "Review pendente preparada para o Hermes processar."
echo "Arquivo: $COMMS_DIR/PENDING_REVIEW.txt"