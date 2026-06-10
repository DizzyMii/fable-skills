#!/usr/bin/env sh
# Install the fable skills into ~/.claude/skills.
# Usage:
#   ./install.sh                     copy skills to ~/.claude/skills
#   ./install.sh --write-claude-md   also insert the activation block into ~/.claude/CLAUDE.md
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
repo_skills="$script_dir/skills"
target="$HOME/.claude/skills"
claude_md="$HOME/.claude/CLAUDE.md"
block_file="$script_dir/claude-md-block.md"

write_claude_md=0
for arg in "$@"; do
    case "$arg" in
        --write-claude-md) write_claude_md=1 ;;
        *) echo "Unknown option: $arg" >&2; exit 2 ;;
    esac
done

mkdir -p "$target"

count=0
for dir in "$repo_skills"/fable-*/; do
    [ -d "$dir" ] || continue
    name=$(basename "$dir")
    dest="$target/$name"
    rm -rf "$dest"
    cp -R "$dir" "$dest"
    count=$((count + 1))
    printf '  - %s\n' "$name"
done
printf 'Installed %d skills to %s\n' "$count" "$target"

if [ "$write_claude_md" -eq 1 ]; then
    block=$(cat "$block_file")
    if [ -f "$claude_md" ]; then
        # Strip any existing marked block (inclusive), then append the fresh copy.
        stripped=$(awk '
            /<!-- fable-skills:start -->/ {skip=1; next}
            /<!-- fable-skills:end -->/   {skip=0; next}
            !skip {print}
        ' "$claude_md")
        # Trim trailing blank lines from the remaining content.
        stripped=$(printf '%s\n' "$stripped" | sed -e :a -e '/^\n*$/{$d;N;ba}')
        printf '%s\n\n%s\n' "$stripped" "$block" > "$claude_md"
    else
        printf '%s\n' "$block" > "$claude_md"
    fi
    printf 'Activation block written to %s\n' "$claude_md"
else
    printf 'CLAUDE.md not modified. To activate, re-run with --write-claude-md or paste claude-md-block.md into %s\n' "$claude_md"
fi
