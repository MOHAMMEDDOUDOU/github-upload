#!/bin/bash

# سكريبت رفع المشروع إلى GitHub
# GitHub Project Upload Script

echo "🚀 بدء عملية رفع المشروع إلى GitHub..."

# التحقق من وجود Git
if ! command -v git &> /dev/null; then
    echo "❌ Git غير مثبت. يرجى تثبيت Git أولاً."
    exit 1
fi

# التحقق من وجود GitHub CLI
if ! command -v gh &> /dev/null; then
    echo "⚠️  GitHub CLI غير مثبت. سيتم استخدام الطريقة التقليدية."
    USE_GH_CLI=false
else
    USE_GH_CLI=true
fi

# إعداد Git
echo "📝 إعداد Git..."

# طلب اسم المستخدم والبريد الإلكتروني
read -p "أدخل اسم المستخدم لـ Git: " GIT_USERNAME
read -p "أدخل البريد الإلكتروني لـ Git: " GIT_EMAIL

git config --global user.name "$GIT_USERNAME"
git config --global user.email "$GIT_EMAIL"

echo "✅ تم إعداد Git بنجاح"

# تهيئة مستودع Git
echo "📁 تهيئة مستودع Git..."
git init

# إضافة جميع الملفات
echo "📦 إضافة الملفات..."
git add .

# Commit أولي
echo "💾 إنشاء commit أولي..."
git commit -m "Initial commit: إضافة المشروع الأساسي"

echo "✅ تم إنشاء المستودع المحلي بنجاح"

# إنشاء مستودع على GitHub
if [ "$USE_GH_CLI" = true ]; then
    echo "🌐 إنشاء مستودع على GitHub باستخدام GitHub CLI..."
    
    read -p "أدخل اسم المستودع: " REPO_NAME
    read -p "أدخل وصف المستودع (اختياري): " REPO_DESCRIPTION
    read -p "هل تريد أن يكون المستودع عاماً؟ (y/n): " REPO_PUBLIC
    
    if [ "$REPO_PUBLIC" = "y" ]; then
        gh repo create "$REPO_NAME" --description "$REPO_DESCRIPTION" --public
    else
        gh repo create "$REPO_NAME" --description "$REPO_DESCRIPTION" --private
    fi
    
    # إضافة remote origin
    git remote add origin "https://github.com/$(gh api user --jq .login)/$REPO_NAME.git"
    
else
    echo "🌐 إنشاء مستودع على GitHub..."
    echo "يرجى إنشاء مستودع جديد على GitHub يدوياً"
    echo "ثم أدخل رابط المستودع:"
    read -p "رابط المستودع (مثال: https://github.com/username/repo-name.git): " REPO_URL
    
    if [ -n "$REPO_URL" ]; then
        git remote add origin "$REPO_URL"
    else
        echo "❌ لم يتم إدخال رابط المستودع"
        exit 1
    fi
fi

# رفع الكود إلى GitHub
echo "⬆️  رفع الكود إلى GitHub..."
git branch -M main
git push -u origin main

echo "✅ تم رفع المشروع إلى GitHub بنجاح!"

# إنشاء ملفات إضافية مفيدة
echo "📄 إنشاء ملفات إضافية..."

# ملف LICENSE
cat > LICENSE << 'EOF'
MIT License

Copyright (c) 2024 

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF

# ملف CONTRIBUTING.md
cat > CONTRIBUTING.md << 'EOF'
# دليل المساهمة

شكراً لاهتمامك بالمساهمة في هذا المشروع!

## كيفية المساهمة

1. Fork المشروع
2. إنشاء فرع جديد (`git checkout -b feature/amazing-feature`)
3. Commit التغييرات (`git commit -m 'Add some amazing feature'`)
4. Push إلى الفرع (`git push origin feature/amazing-feature`)
5. فتح Pull Request

## قواعد المساهمة

- تأكد من أن الكود يتبع معايير المشروع
- أضف اختبارات للميزات الجديدة
- تأكد من أن جميع الاختبارات تمر
- اكتب تعليقات واضحة ومفيدة

## الإبلاغ عن الأخطاء

عند الإبلاغ عن خطأ، يرجى تضمين:
- وصف مفصل للمشكلة
- خطوات إعادة إنتاج المشكلة
- معلومات النظام والبيئة
- لقطات شاشة (إن أمكن)

## طلب ميزات جديدة

عند طلب ميزة جديدة، يرجى:
- وصف الميزة المطلوبة
- شرح سبب الحاجة إليها
- اقتراح كيفية تنفيذها (إن أمكن)
EOF

# إضافة الملفات الجديدة
git add LICENSE CONTRIBUTING.md
git commit -m "docs: إضافة ملفات LICENSE و CONTRIBUTING"
git push

echo "✅ تم إنشاء ملفات LICENSE و CONTRIBUTING بنجاح"

# إنشاء ملف package.json إذا لم يكن موجوداً
if [ ! -f "package.json" ]; then
    echo "📦 إنشاء ملف package.json..."
    cat > package.json << 'EOF'
{
  "name": "project-name",
  "version": "1.0.0",
  "description": "وصف المشروع هنا",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "test": "jest",
    "build": "echo 'Build script here'",
    "lint": "eslint .",
    "format": "prettier --write ."
  },
  "keywords": ["project", "github", "upload"],
  "author": "Your Name",
  "license": "MIT",
  "devDependencies": {
    "nodemon": "^2.0.22",
    "jest": "^29.0.0",
    "eslint": "^8.0.0",
    "prettier": "^2.8.0"
  }
}
EOF

    git add package.json
    git commit -m "feat: إضافة ملف package.json"
    git push
fi

echo ""
echo "🎉 تم إكمال عملية رفع المشروع إلى GitHub بنجاح!"
echo ""
echo "📋 ملخص ما تم إنجازه:"
echo "✅ إعداد Git"
echo "✅ تهيئة المستودع المحلي"
echo "✅ إنشاء مستودع على GitHub"
echo "✅ رفع الكود"
echo "✅ إضافة ملفات LICENSE و CONTRIBUTING"
echo "✅ إنشاء package.json (إذا لم يكن موجوداً)"
echo ""
echo "🔗 يمكنك الآن الوصول إلى مشروعك على GitHub!"
echo ""
echo "📝 الخطوات التالية:"
echo "1. تحديث README.md بمعلومات مشروعك"
echo "2. إضافة الكود الفعلي للمشروع"
echo "3. إعداد CI/CD إذا لزم الأمر"
echo "4. إضافة الاختبارات"
echo ""
echo "شكراً لاستخدام هذا السكريبت! 🚀" 