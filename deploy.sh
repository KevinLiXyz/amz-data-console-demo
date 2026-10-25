#!/usr/bin/env bash
# 发布原型到 GitHub Pages（需先建好空仓库 + SSH key 可用）
# 用法：./deploy.sh <repo-name> [github-user]
set -euo pipefail

REPO="${1:?用法: ./deploy.sh <repo-name> [github-user]}"
USER="${2:-Kevin-X00}"
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

if [ ! -d .git ]; then
  git init -q
  git checkout -q -b main
  git remote add origin "git@github.com:${USER}/${REPO}.git"
fi

git add -A
git commit -q -m "prototype: AMZ data console demo $(date +%F)" || echo "没有新改动"
git push -u origin main

echo "已推送：https://github.com/${USER}/${REPO}"
echo "下一步：Settings → Pages → Source 选 main / root"
echo "上线地址：https://${USER,,}.github.io/${REPO}/"
