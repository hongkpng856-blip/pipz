#!/bin/sh
# Xcode Cloud：clone 完之後自動生成 Pipz.xcodeproj（repo 只 store project.yml）
set -e

REPO="${CI_PRIMARY_REPOSITORY_PATH:-$(cd "$(dirname "$0")/../../.." && pwd)}"
echo "repo: $REPO"

if ! command -v xcodegen >/dev/null 2>&1; then
  echo "xcodegen not found — downloading release binary"
  XCODEGEN_VERSION="2.42.0"
  curl -sL -o /tmp/xcodegen.zip \
    "https://github.com/yonaskolb/XcodeGen/releases/download/${XCODEGEN_VERSION}/xcodegen.zip"
  unzip -q /tmp/xcodegen.zip -d /tmp
  export PATH="/tmp/xcodegen/bin:$PATH"
fi

cd "$REPO/apps/ios"
xcodegen --version
xcodegen generate
ls -la
