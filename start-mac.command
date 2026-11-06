#!/bin/bash
# Double-click starter for macOS: checks Node, installs, registers the read-only server, offers to log in.
cd "$(dirname "$0")"
set -e

echo "== lineoa-cs: เริ่มต้นใช้งาน =="

need_node() {
  echo ""
  echo "ไม่พบ Node.js หรือเวอร์ชันเก่าเกินไป (ต้องใช้ 22.13 ขึ้นไป)"
  echo "กำลังเปิดหน้าดาวน์โหลด: https://nodejs.org (เลือกรุ่น LTS)"
  echo "ติดตั้งเสร็จแล้ว ให้ปิดหน้าต่างนี้ แล้วดับเบิลคลิก start-mac.command อีกครั้ง"
  open https://nodejs.org
  read -r -p "กด Enter เพื่อปิด" _
  exit 1
}

if ! command -v node >/dev/null 2>&1; then
  need_node
fi
version="$(node -v | sed 's/^v//')"
major="${version%%.*}"
rest="${version#*.}"
minor="${rest%%.*}"
if [ "$major" -lt 22 ] || { [ "$major" -eq 22 ] && [ "$minor" -lt 13 ]; }; then
  need_node
fi
echo "Node v$version ใช้ได้"

echo ""
echo "ติดตั้งโปรแกรม (ครั้งแรกอาจใช้เวลาหนึ่งนาที)..."
npm ci --ignore-scripts

echo ""
echo "เพิ่ม lineoa-cs เข้า Claude (โหมดอ่านอย่างเดียว)..."
npm run setup

echo ""
read -r -p "ต้องการ login LINE ตอนนี้เลยไหม? (y/n) " answer
if [ "$answer" = "y" ] || [ "$answer" = "Y" ]; then
  npm run login
else
  echo "ข้ามไปก่อน ไว้ login ทีหลังด้วยคำสั่ง: npm run login"
fi

echo ""
echo "เสร็จแล้ว ขั้นต่อไป:"
echo "  1. เปิด Claude Desktop ใหม่ (ปิดให้สนิทแล้วเปิดอีกครั้ง)"
echo "  2. ลองถามว่า: มีแชทไหนรอตอบบ้าง"
echo "  3. session LINE หมดอายุประมาณวันละครั้ง ให้รัน npm run login อีกครั้ง"
echo "  คู่มือภาษาไทย: docs/START.th.md และ docs/USAGE.th.md"
echo ""
read -r -p "กด Enter เพื่อปิด" _
