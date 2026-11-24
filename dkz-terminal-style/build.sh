#!/usr/bin/env bash
# DkZ Terminal Style — tokens.json → dist/ + HTML-Marker. Details: build.py
#   ./build.sh           bauen        ./build.sh --check   nur prüfen (CI)
set -euo pipefail
command -v python3 >/dev/null 2>&1 || { echo "python3 fehlt" >&2; exit 127; }
exec python3 "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/build.py" "$@"
