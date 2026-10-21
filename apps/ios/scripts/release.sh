#!/bin/bash
# Pipz iOS — 一鍵 release（喺 Mac 上面跑）
#
#   ./scripts/release.sh              # generate → archive → export IPA → 上傳 TestFlight
#   ./scripts/release.sh --no-upload  # 只 build + 出 IPA（第一次試機用呢個）
#   ./scripts/release.sh --bump       # 自動用時間做 build number（預設已經係）
#
# 需要的環境變數（可放喺 ~/.pipz_release_env，script 會自動 source）：
#   APPLE_TEAM_ID          Apple Developer Team ID（唔填就由 project.yml 讀）
#   ASC_KEY_ID             App Store Connect API Key ID（推薦）
#   ASC_ISSUER_ID          App Store Connect Issuer ID
#   ASC_KEY_PATH           AuthKey_XXXX.p8 路徑（預設 ~/private_keys/AuthKey_<KEYID>.p8）
#   APPLE_ID / APP_SPECIFIC_PASSWORD   冇 API key 時用 app-specific password 上傳
#
# 輸出：build/Pipz.xcarchive, build/export/Pipz.ipa, build/release.log

set -euo pipefail

UPLOAD=1
for arg in "$@"; do
  case "$arg" in
    --no-upload) UPLOAD=0 ;;
    --bump|--upload) : ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "未知參數：$arg（用 --help 睇用法）" >&2; exit 2 ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IOS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$IOS_DIR"

# 可選：本機憑證檔
if [ -f "$HOME/.pipz_release_env" ]; then
  # shellcheck disable=SC1090
  source "$HOME/.pipz_release_env"
fi

LOG="$IOS_DIR/build/release.log"
mkdir -p "$IOS_DIR/build"
exec > >(tee -a "$LOG") 2>&1

echo "=== Pipz release $(date '+%Y-%m-%d %H:%M:%S') ==="
echo "目錄：$IOS_DIR"

# ---------- 0. 環境檢查 ----------
command -v xcodebuild >/dev/null 2>&1 || { echo "❌ 搵唔到 xcodebuild：要裝 Xcode"; exit 1; }
xcodebuild -version

if ! command -v xcodegen >/dev/null 2>&1; then
  echo "→ 冇 xcodegen，嘗試用 brew 裝"
  if command -v brew >/dev/null 2>&1; then
    brew install xcodegen
  else
    XCODEGEN_VERSION="2.42.0"
    curl -sL -o /tmp/xcodegen.zip \
      "https://github.com/yonaskolb/XcodeGen/releases/download/${XCODEGEN_VERSION}/xcodegen.zip"
    unzip -q /tmp/xcodegen.zip -d /tmp
    export PATH="/tmp/xcodegen/bin:$PATH"
  fi
fi
xcodegen --version

TEAM_ID="${APPLE_TEAM_ID:-$(grep -E '^\s+DEVELOPMENT_TEAM:' project.yml | head -1 | sed 's/.*DEVELOPMENT_TEAM:\s*//; s/"//g')}"
BUNDLE_ID="$(grep -E 'PRODUCT_BUNDLE_IDENTIFIER:' project.yml | head -1 | sed 's/.*PRODUCT_BUNDLE_IDENTIFIER:\s*//; s/"//g')"
TEAM_ID="${TEAM_ID:-}"
BUNDLE_ID="${BUNDLE_ID:-com.anthroskill.pipz}"

if [ -z "$TEAM_ID" ]; then
  echo "❌ 冇 Team ID。設定方法（任一）："
  echo "   export APPLE_TEAM_ID=XXXXXXXXXX        # developer.apple.com → Membership"
  echo "   或喺 project.yml 填 DEVELOPMENT_TEAM"
  echo "   或者喺 Xcode → Signing & Capabilities 揀 Team（Xcode 會寫入 project，但 xcodegen 會覆蓋）"
  exit 1
fi
echo "Team: $TEAM_ID   Bundle: $BUNDLE_ID"

BUILD_NUMBER="$(date +%Y%m%d%H%M)"
MARKETING_VERSION="$(grep -E '^\s+MARKETING_VERSION:' project.yml | head -1 | sed 's/.*MARKETING_VERSION:\s*//; s/"//g')"
MARKETING_VERSION="${MARKETING_VERSION:-1.0.0}"
echo "版本：$MARKETING_VERSION ($BUILD_NUMBER)"

# ---------- 1. 生成 project ----------
echo "→ xcodegen generate"
xcodegen generate

# ---------- 2. Archive ----------
echo "→ xcodebuild archive（可能要 2–5 分鐘）"
rm -rf build/Pipz.xcarchive build/export
xcodebuild archive \
  -project Pipz.xcodeproj \
  -scheme Pipz \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$IOS_DIR/build/Pipz.xcarchive" \
  -allowProvisioningUpdates \
  DEVELOPMENT_TEAM="$TEAM_ID" \
  CODE_SIGN_STYLE=Automatic \
  MARKETING_VERSION="$MARKETING_VERSION" \
  CURRENT_PROJECT_VERSION="$BUILD_NUMBER"

[ -d build/Pipz.xcarchive ] || { echo "❌ 冇出 archive"; exit 1; }
echo "✅ archive OK"

# ---------- 3. Export IPA ----------
echo "→ 匯出 IPA"
sed -e "s|__TEAM_ID__|${TEAM_ID}|g" \
    -e "s|__BUNDLE_ID__|${BUNDLE_ID}|g" \
    -e "s|__PROFILE_NAME__|XC Universal|g" \
    ci/ExportOptions.plist > build/ExportOptions.plist

xcodebuild -exportArchive \
  -archivePath "$IOS_DIR/build/Pipz.xcarchive" \
  -exportOptionsPlist "$IOS_DIR/build/ExportOptions.plist" \
  -exportPath "$IOS_DIR/build/export" \
  -allowProvisioningUpdates

IPA="$(ls build/export/*.ipa 2>/dev/null | head -1 || true)"
[ -n "$IPA" ] || { echo "❌ 冇出 IPA（多數係簽名問題，睇上面 xcodebuild 訊息）"; exit 1; }
echo "✅ IPA: $IPA"

# ---------- 4. 上傳 ----------
if [ "$UPLOAD" -eq 0 ]; then
  echo "→ 跳過上傳（--no-upload）。IPA 喺：$IOS_DIR/$IPA"
  exit 0
fi

ASC_KEY_PATH="${ASC_KEY_PATH:-$HOME/private_keys/AuthKey_${ASC_KEY_ID:-}.p8}"

if [ -n "${ASC_KEY_ID:-}" ] && [ -n "${ASC_ISSUER_ID:-}" ] && [ -f "$ASC_KEY_PATH" ]; then
  echo "→ 用 App Store Connect API key 上傳"
  xcrun altool --upload-app \
    -f "$IPA" \
    -t ios \
    --apiKey "$ASC_KEY_ID" \
    --apiIssuer "$ASC_ISSUER_ID" \
    --private-key "$ASC_KEY_PATH" \
    --verbose
elif [ -n "${APPLE_ID:-}" ] && [ -n "${APP_SPECIFIC_PASSWORD:-}" ]; then
  echo "→ 用 Apple ID + app-specific password 上傳"
  xcrun altool --upload-app -f "$IPA" -t ios -u "$APPLE_ID" -p "$APP_SPECIFIC_PASSWORD" --verbose
else
  cat <<EOF

⚠️ 冇上傳憑證，IPA 已經準備好：$IOS_DIR/$IPA

二選一：
  A) App Store Connect API key（推薦，可重用）
     ~/private_keys/AuthKey_<KEYID>.p8
     export ASC_KEY_ID=... ASC_ISSUER_ID=...
  B) App-specific password
     export APPLE_ID=you@example.com APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx
  C) 手動：開 Transporter.app → 拖個 IPA 入去 → Deliver
     或者 Xcode → Window → Organizer → Distribute App
EOF
  exit 3
fi

echo "✅ 已上傳。去 App Store Connect → Pipz → TestFlight 睇 Processing（5–30 分鐘）"
