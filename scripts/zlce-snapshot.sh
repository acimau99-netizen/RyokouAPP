#!/usr/bin/env bash
# ZLCE snapshot wrapper.
# Forwards execution to canonical scripts/zlce/zlce-snapshot.sh
set -e
here="$(cd "$(dirname "$0")" && pwd)"
exec bash "$here/zlce/zlce-snapshot.sh" "$@"
