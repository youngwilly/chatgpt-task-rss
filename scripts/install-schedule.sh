#!/bin/zsh
set -euo pipefail
ROOT="${0:A:h:h}"
PLIST="$HOME/Library/LaunchAgents/com.youngwilly.chatgpt-task-rss.plist"
mkdir -p "$HOME/Library/LaunchAgents" "$ROOT/logs"
sed "s|__ROOT__|$ROOT|g" "$ROOT/config/com.youngwilly.chatgpt-task-rss.plist.template" > "$PLIST"
launchctl bootout "gui/$(id -u)" "$PLIST" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "已安装定时采集任务（每日 06:40、周日 22:10）：$PLIST"
