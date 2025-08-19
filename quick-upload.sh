#!/bin/bash

# سكريبت رفع سريع للمشروع إلى GitHub
# Quick GitHub Upload Script

echo "⚡ رفع سريع للمشروع إلى GitHub..."

# التحقق من وجود Git
if ! command -v git &> /dev/null; then
    echo "❌ Git غير مثبت. يرجى تثبيت Git أولاً."
    exit 1
fi

# إعداد Git (استخدام القيم الافتراضية)
git config --global user.name "Your Name" 2>/dev/null || true
git config --global user.email "your.email@example.com" 2>/dev/null || true

# تهيئة Git
git init
git add .
git commit -m "Initial commit"

echo "✅ تم إعداد المستودع المحلي"

# طلب رابط المستودع
echo "🌐 أدخل رابط المستودع على GitHub:"
echo "مثال: https://github.com/username/repo-name.git"
read -p "رابط المستودع: " REPO_URL

if [ -n "$REPO_URL" ]; then
    git remote add origin "$REPO_URL"
    git branch -M main
    git push -u origin main
    
    echo "✅ تم رفع المشروع بنجاح!"
    echo "🔗 يمكنك الوصول إلى مشروعك على: $REPO_URL"
else
    echo "❌ لم يتم إدخال رابط المستودع"
    exit 1
fi 