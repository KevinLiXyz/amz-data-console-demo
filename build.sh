#!/usr/bin/env bash
# 把 index.html + assets 打包成单文件原型（发给客户/上传飞书用）
set -euo pipefail
cd "$(dirname "$0")"

python3 - <<'PY'
import re, pathlib

root = pathlib.Path('.')
html = (root / 'index.html').read_text(encoding='utf-8')

css = (root / 'assets/app.css').read_text(encoding='utf-8')
html = re.sub(r'<link rel="stylesheet" href="\./assets/app\.css\?v=\d+" />', '<style>\n' + css + '\n</style>', html)

def inline(m):
    src = m.group(1).split('?')[0]
    code = (root / src).read_text(encoding='utf-8')
    if '</script>' in code:
        code = code.replace('</script>', '<\\/script>')
    return '<script>\n' + code + '\n</script>'

html = re.sub(r'<script src="(\./assets/[^"]+)"></script>', inline, html)

out = root / 'AMZ-数据台-原型.html'
out.write_text(html, encoding='utf-8')
print('built', out, len(html.encode('utf-8')), 'bytes')
PY
