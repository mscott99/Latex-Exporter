#!/usr/bin/env bash
# Export a longform note to LaTeX without Obsidian running.
#
# Usage:
#   scripts/export_longform.sh <note> [out_dir]
#
# <note>    basename or vault-relative path of the longform note
# [out_dir] output folder (default: the plugin's own base_output_folder setting,
#           or the note's `export_dir:` yaml field)
#
# Env:
#   EXPORT_VAULT   vault root (default: $HOME/Obsidian/myVault)
#   EXPORT_STRICT  1 to exit nonzero when the export emits warnings
#
# Runs the jest-driven export in tests/headless_export.test.ts, which uses the
# plugin's own parsing core with the filesystem standing in for the vault API.
set -euo pipefail

if [ $# -lt 1 ]; then
	echo "usage: $(basename "$0") <note> [out_dir]" >&2
	exit 64
fi

plugin_dir="$(cd "$(dirname "$0")/.." && pwd)"
cd "$plugin_dir"

export EXPORT_NOTE="$1"
if [ $# -ge 2 ]; then
	export EXPORT_OUT="$2"
fi
export EXPORT_VAULT="${EXPORT_VAULT:-$HOME/Obsidian/myVault}"

npx jest tests/headless_export.test.ts \
	--testPathPattern headless_export \
	-t "exports the requested longform" \
	--verbose=false
