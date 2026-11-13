#!/usr/bin/env bash
set -euo pipefail

KIT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_DIR="."
WIZARD_JSON=""
PROJECT_NAME=""
MODE="copy"
SKILLS_DIR=""
PRESERVE_DOCS=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --target) TARGET_DIR="$2"; shift 2 ;;
    --wizard) WIZARD_JSON="$2"; shift 2 ;;
    --project-name) PROJECT_NAME="$2"; shift 2 ;;
    --mode) MODE="$2"; shift 2 ;;
    --skills-dir) SKILLS_DIR="$2"; shift 2 ;;
    --preserve-docs) PRESERVE_DOCS="--preserve-docs"; shift ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

mkdir -p "$TARGET_DIR"
TARGET_DIR="$(cd "$TARGET_DIR" && pwd)"

if [[ -n "$WIZARD_JSON" ]]; then
  ARGS=(python3 "$KIT_ROOT/scripts/generate_workflow.py" --wizard "$WIZARD_JSON" --output "$TARGET_DIR" --mode "$MODE")
  [[ -n "$PROJECT_NAME" ]] && ARGS+=(--project-name "$PROJECT_NAME")
  [[ -n "$SKILLS_DIR" ]] && ARGS+=(--skills-dir "$SKILLS_DIR")
  [[ -n "$PRESERVE_DOCS" ]] && ARGS+=("$PRESERVE_DOCS")

  "${ARGS[@]}"
  python3 "$TARGET_DIR/scripts/verify_workflow.py" --project "$TARGET_DIR"
  echo ""
  echo "[READY] Open $TARGET_DIR in Google Antigravity and describe your app idea!"
  exit 0
fi

mkdir -p "$TARGET_DIR/.agents/rules" "$TARGET_DIR/.agents/skills" "$TARGET_DIR/wizard"
mkdir -p "$TARGET_DIR/.agents/kit/scripts" "$TARGET_DIR/.agents/kit/catalog" "$TARGET_DIR/.agents/kit/templates" "$TARGET_DIR/.agents/kit/kit_skills" "$TARGET_DIR/.agents/kit/skills"

cp "$KIT_ROOT/templates/.agents/rules/"*.md "$TARGET_DIR/.agents/rules/"
cp -R "$KIT_ROOT/kit_skills/"* "$TARGET_DIR/.agents/skills/"
cp "$KIT_ROOT/scripts/generate_workflow.py" "$TARGET_DIR/.agents/kit/scripts/"
cp "$KIT_ROOT/scripts/verify_workflow.py" "$TARGET_DIR/.agents/kit/scripts/"
cp -R "$KIT_ROOT/catalog/"* "$TARGET_DIR/.agents/kit/catalog/"
cp -R "$KIT_ROOT/templates/"* "$TARGET_DIR/.agents/kit/templates/"
cp -R "$KIT_ROOT/kit_skills/"* "$TARGET_DIR/.agents/kit/kit_skills/"
cp -R "$KIT_ROOT/skills/"* "$TARGET_DIR/.agents/kit/skills/"
cp "$KIT_ROOT/wizard/skills_decision_wizard.html" "$TARGET_DIR/wizard/skills_decision_wizard.html"
cp "$KIT_ROOT/NON_DEV_GUIDE.md" "$TARGET_DIR/NON_DEV_GUIDE.md"

cat > "$TARGET_DIR/AGENTS.md" << 'EOF'
# Vibecode Setup Pending Wizard Selection (`AGENTS.md`)

Your **Antigravity Dynamic Vibecode Kit** is installed and waiting for your **Skills Decision Wizard** answers.

## Next Step
1. Open `wizard/skills_decision_wizard.html` in your browser and answer the simple questions.
2. Click **"Copy Chat Prompt (No Terminal Needed)"** and paste it directly into Antigravity.
3. Antigravity runs `dynamic-workflow-architect` + `python .agents/kit/scripts/generate_workflow.py --wizard wizard-selection.json --output .` to build your tailored workflow using 100% of your selected skills.
EOF

echo "[BOOTSTRAPPED] Base kit installed in $TARGET_DIR"
echo "Open $TARGET_DIR/wizard/skills_decision_wizard.html to begin!"
