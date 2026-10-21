#!/bin/bash
# 純型別檢查：用 Simulator SDK 編譯，唔需要簽名憑證、唔需要真機
# 用途：Windows 寫完 Swift，第一時間喺 Mac 上驗「到底 type-check 過唔過」
#
#   ./scripts/typecheck.sh            # 只印錯誤（省畫面）
#   ./scripts/typecheck.sh --full     # 印全部 xcodebuild 輸出

set -uo pipefail

FULL=0
[ "${1:-}" = "--full" ] && FULL=1

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IOS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$IOS_DIR"

command -v xcodebuild >/dev/null 2>&1 || { echo "❌ 要裝 Xcode"; exit 1; }

if ! command -v xcodegen >/dev/null 2>&1; then
  echo "→ 冇 xcodegen，用 brew 裝"
  brew install xcodegen || exit 1
fi
xcodegen generate >/dev/null

OUT="$(mktemp -t pipz-typecheck)"
echo "→ xcodebuild（Simulator SDK，唔簽名）…"

set -o pipefail
xcodebuild build \
  -project Pipz.xcodeproj \
  -scheme Pipz \
  -configuration Debug \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath build/DerivedData \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY="" \
  > "$OUT" 2>&1
STATUS=$?

if [ "$FULL" -eq 1 ]; then
  cat "$OUT"
fi

echo
echo "=== 錯誤（error:） ==="
grep -E "error:" "$OUT" | sed 's|.*/Pipz/|Pipz/|' | sort -u | head -60
ERR_COUNT="$(grep -cE "error:" "$OUT" || true)"
WARN_COUNT="$(grep -cE "warning:" "$OUT" || true)"

echo
echo "錯誤：$ERR_COUNT　警告：$WARN_COUNT　完整 log：$OUT"

if [ "$STATUS" -eq 0 ]; then
  echo "✅ TYPE-CHECK 過（可以行 archive / release.sh）"
  exit 0
else
  echo "❌ 編譯失敗（上面係錯誤摘要；要全文加 --full）"
  exit 1
fi
