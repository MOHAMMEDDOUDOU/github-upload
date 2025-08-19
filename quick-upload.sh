#!/bin/bash

# سكريبت رفع سريع للمشروع إلى GitHub
# Quick GitHub Upload Script

echo "⚡ رفع سريع للمشروع إلى GitHub..."

# التحقق من وجود Git
if ! command -v git &> /dev/null; then
    echo "❌ Git غير مثبت. يرجى تثبيت Git أولاً."
    exit 1
fi

# التحقق من وجود مستودع Git
if [ -d ".git" ]; then
    echo "⚠️  يوجد مستودع Git بالفعل. هل تريد المتابعة؟ (y/n)"
    read -p "اختيارك: " CONTINUE
    if [ "$CONTINUE" != "y" ]; then
        echo "❌ تم إلغاء العملية"
        exit 1
    fi
fi

# إعداد Git
echo "📝 إعداد Git..."
read -p "أدخل اسم المستخدم لـ Git: " GIT_USERNAME
read -p "أدخل البريد الإلكتروني لـ Git: " GIT_EMAIL

git config --global user.name "$GIT_USERNAME"
git config --global user.email "$GIT_EMAIL"

# تهيئة Git
echo "📁 تهيئة مستودع Git..."
git init

# التحقق من الملفات المهمة التي قد يتم تجاهلها
echo "🔍 التحقق من الملفات المهمة..."
IMPORTANT_FILES=("Makefile" "Dockerfile" "docker-compose.yml" ".env.example" "config.json.example")

for file in "${IMPORTANT_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "📄 إضافة ملف مهم: $file"
        git add -f "$file"
    fi
done

# إضافة جميع الملفات
echo "📦 إضافة جميع الملفات..."
git add .

# التحقق من الملفات التي تم إضافتها
echo "📋 الملفات التي تم إضافتها:"
git status --porcelain | grep "^A" | cut -c4-

# التحقق من الملفات التي تم تجاهلها
echo "🚫 الملفات التي تم تجاهلها:"
git status --ignored | grep "^!!" | cut -c4-

# Commit أولي
echo "💾 إنشاء commit أولي..."
git commit -m "Initial commit: إضافة المشروع الأساسي"

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
    
    # عرض الملفات التي تم رفعها
    echo "📁 الملفات التي تم رفعها:"
    git ls-files
else
    echo "❌ لم يتم إدخال رابط المستودع"
    exit 1
fi 