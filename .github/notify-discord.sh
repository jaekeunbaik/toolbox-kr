#!/usr/bin/env bash
# Post an approve/reject message for PR $1 to Discord. Needs GH_TOKEN, DISCORD_BOT_TOKEN, DISCORD_CHANNEL_ID.
set -euo pipefail
pr=$1
if [ -z "${DISCORD_BOT_TOKEN:-}" ]; then echo "Discord not configured; skipping PR #$pr"; exit 0; fi

title=$(gh pr view "$pr" --json title -q .title)
stat=$(gh pr diff "$pr" --name-only | head -20)
url="https://github.com/$GITHUB_REPOSITORY/pull/$pr"
# cut by characters (not bytes) so Korean text is never split mid-character
content=$(printf '🛠️ **새 수정 제안** #%s\n%s\n```\n%s\n```' "$pr" "$title" "$stat" | cut -c1-1800)

body=$(jq -n --arg c "$content" --arg pr "$pr" --arg url "$url" '{content:$c, components:[{type:1, components:[
  {type:2, style:3, label:"승인", custom_id:("approve:"+$pr)},
  {type:2, style:4, label:"반려", custom_id:("reject:"+$pr)},
  {type:2, style:5, label:"변경 보기", url:($url+"/files")}]}]}')

code=$(curl -s -o /tmp/discord.out -w '%{http_code}' -X POST "https://discord.com/api/v10/channels/$DISCORD_CHANNEL_ID/messages" \
  -H "Authorization: Bot $DISCORD_BOT_TOKEN" -H "Content-Type: application/json" -d "$body")
if [ "$code" != 200 ]; then
  echo "::error::Discord HTTP $code: $(cat /tmp/discord.out)"
  echo "401 = bot token wrong, 403 = bot not invited to the server or can't see the channel, 404 = wrong channel ID"
  exit 1
fi
echo "Discord notified for PR #$pr"
