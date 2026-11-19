#!/usr/bin/env bash
# Builds Emberwake.apk without Gradle, using the Debian/Ubuntu Android SDK packages:
#   apt-get install aapt apksigner dalvik-exchange android-sdk-platform-23 zipalign
set -euo pipefail
cd "$(dirname "$0")"
SDK=/usr/lib/android-sdk
JAR=$SDK/platforms/android-23/android.jar
BT=$SDK/build-tools/debian
OUT=build
rm -rf "$OUT" && mkdir -p "$OUT/gen" "$OUT/obj"

[ -f keystore/emberwake.keystore ] || { mkdir -p keystore; keytool -genkeypair -keystore keystore/emberwake.keystore -storepass emberwake -keypass emberwake \
  -alias emberwake -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Emberwake, O=Emberwake" >/dev/null; }

aapt package -f -m -J "$OUT/gen" -M AndroidManifest.xml -S res -I "$JAR"
javac -nowarn -Xlint:-options --release 8 -classpath "$JAR" -d "$OUT/obj" $(find src "$OUT/gen" -name '*.java')
"$BT/dx" --dex --min-sdk-version=23 --output="$OUT/classes.dex" "$OUT/obj"
aapt package -f -0 arsc -M AndroidManifest.xml -S res -A assets -I "$JAR" -F "$OUT/unsigned.apk"
(cd "$OUT" && aapt add unsigned.apk classes.dex >/dev/null)
zipalign -f -p 4 "$OUT/unsigned.apk" "$OUT/aligned.apk"
apksigner sign --ks keystore/emberwake.keystore --ks-pass pass:emberwake --key-pass pass:emberwake --out ../Emberwake.apk "$OUT/aligned.apk"
apksigner verify ../Emberwake.apk && echo "Built ../Emberwake.apk"
rm -f ../Emberwake.apk.idsig

# version.json is what the in-game updater checks (served from GitHub raw on the release branch)
python3 - <<'PY'
import json, re
m = open('AndroidManifest.xml').read()
code = int(re.search(r'versionCode="(\d+)"', m).group(1))
name = re.search(r'versionName="([^"]+)"', m).group(1)
notes = [l.strip() for l in open('release-notes.txt') if l.strip()]
url = "https://raw.githubusercontent.com/nooberttmc/nooberto/claude/android-game-apk-w2q4io/Emberwake.apk"
json.dump({"versionCode": code, "versionName": name, "apk": url, "notes": notes}, open('../version.json', 'w'), indent=2)
print("Wrote ../version.json for v%s (%d)" % (name, code))
PY
