#!/usr/bin/env bash
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
unset ELECTRON_RUN_AS_NODE
exec "$DIR/node_modules/electron/dist/electron.exe" "$DIR/."
