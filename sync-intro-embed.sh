#!/bin/sh
# Introduce.md 변경 후 file:// 미리보기용 intro-embed.js 를 다시 만듭니다.
cd "$(dirname "$0")" || exit 1
node -e "const f=require('fs');const s=f.readFileSync('Introduce.md','utf8');f.writeFileSync('intro-embed.js','window.INTRO_MD = '+JSON.stringify(s)+';\n');"
echo "OK: intro-embed.js"
