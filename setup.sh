#!/usr/bin/env bash
# Applies the local .env to this repo: git author identity, remote, and (optionally) the token.
set -euo pipefail
cd "$(dirname "$0")"
[ -f .env ] || { echo "No .env found. Copy .env.example to .env and fill it in."; exit 1; }
set -a; . ./.env; set +a
git config user.name  "$GIT_AUTHOR_NAME"
git config user.email "$GIT_AUTHOR_EMAIL"
git remote get-url origin >/dev/null 2>&1 || git remote add origin "https://github.com/$GITHUB_USER/$GITHUB_REPO.git"
if [ -n "${GITHUB_TOKEN:-}" ]; then
  printf 'protocol=https\nhost=github.com\nusername=%s\npassword=%s\n' "$GITHUB_USER" "$GITHUB_TOKEN" | git credential-osxkeychain store
  echo "Token stored in macOS Keychain."
fi
echo "Git identity: $(git config user.name) <$(git config user.email)>"
echo "Remote:       $(git remote get-url origin)"
