#!/bin/bash

# سكريبت رفع مباشر للمشروع إلى GitHub
# Direct Upload Script - يضمن رفع الملفات في جذر المستودع

set -e  # إيقاف السكريبت عند حدوث خطأ

echo "🎯 سكريبت رفع مباشر للمشروع إلى GitHub"
echo "======================================"
echo "يضمن رفع الملفات مباشرة في جذر المستودع"
echo ""

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
    echo "✅ GitHub CLI متوفر"
    USE_GH_CLI=true
fi

# التحقق من أننا في المجلد الصحيح
echo "🔍 التحقق من محتويات المجلد الحالي..."
echo "المجلد الحالي: $(pwd)"
echo "المحتويات:"
ls -la | head -10

# التحقق من وجود ملفات المشروع
if [ ! -f "package.json" ] && [ ! -f "index.html" ] && [ ! -f "main.py" ] && [ ! -f "app.js" ] && [ ! -f "index.js" ]; then
    echo "⚠️  تحذير: لا يبدو أن هذا مجلد مشروع نموذجي"
    echo "هل تريد المتابعة؟ (y/n)"
    read -p "اختيارك: " CONTINUE
    if [ "$CONTINUE" != "y" ]; then
        echo "❌ تم إلغاء العملية"
        exit 1
    fi
fi

# التحقق من وجود مستودع Git
if [ -d ".git" ]; then
    echo "⚠️  يوجد مستودع Git بالفعل في هذا المجلد."
    echo "هل تريد:"
    echo "1) إضافة الملفات الجديدة إلى المستودع الحالي"
    echo "2) إنشاء مستودع جديد (سيحذف المستودع الحالي)"
    echo "3) إلغاء العملية"
    read -p "اختيارك (1/2/3): " CHOICE
    
    case $CHOICE in
        1)
            echo "📝 إضافة الملفات الجديدة إلى المستودع الحالي..."
            ;;
        2)
            echo "🗑️  حذف المستودع الحالي..."
            rm -rf .git
            ;;
        3)
            echo "❌ تم إلغاء العملية"
            exit 0
            ;;
        *)
            echo "❌ اختيار غير صحيح"
            exit 1
            ;;
    esac
fi

# إعداد Git
echo "📝 إعداد Git..."
if [ -z "$GIT_USERNAME" ]; then
    read -p "أدخل اسم المستخدم لـ Git: " GIT_USERNAME
fi
if [ -z "$GIT_EMAIL" ]; then
    read -p "أدخل البريد الإلكتروني لـ Git: " GIT_EMAIL
fi

git config --global user.name "$GIT_USERNAME"
git config --global user.email "$GIT_EMAIL"

# تهيئة مستودع Git (إذا لم يكن موجوداً)
if [ ! -d ".git" ]; then
    echo "📁 تهيئة مستودع Git..."
    git init
fi

# إنشاء ملف .gitignore محسن
echo "📄 إنشاء ملف .gitignore محسن..."
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
package-lock.json
yarn.lock
pnpm-lock.yaml

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory
coverage/
*.lcov

# nyc test coverage
.nyc_output

# Dependency directories
jspm_packages/

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env
.env.test
.env.local
.env.production

# parcel-bundler cache
.cache
.parcel-cache

# Next.js build output
.next

# Nuxt.js build / generate output
.nuxt
dist

# Gatsby files
.cache/
public

# Storybook build outputs
.out
.storybook-out

# Temporary folders
tmp/
temp/

# Logs
logs
*.log

# Runtime data
pids
*.pid
*.seed

# IDE and editor files
.vscode/
.idea/
*.swp
*.swo
*~

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Build artifacts
build/
target/

# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/
ENV/
env.bak/
venv.bak/

# Java
*.class
*.jar
*.war
*.ear

# CMake (but keep important Makefiles)
CMakeCache.txt
CMakeFiles/
cmake_install.cmake
*.cmake
!CMakeLists.txt
EOF

# التحقق من الملفات المهمة التي قد يتم تجاهلها
echo "🔍 التحقق من الملفات المهمة..."
IMPORTANT_FILES=(
    "Makefile"
    "Dockerfile"
    "docker-compose.yml"
    "docker-compose.yaml"
    ".env.example"
    "config.json.example"
    "package-lock.json"
    "yarn.lock"
    "pnpm-lock.yaml"
    "composer.lock"
    "requirements.txt"
    "Pipfile"
    "Pipfile.lock"
    "poetry.lock"
    "Cargo.lock"
    "go.mod"
    "go.sum"
    "Gemfile.lock"
    "mix.lock"
    "pubspec.lock"
    "bun.lockb"
    "CMakeLists.txt"
)

echo "📄 إضافة الملفات المهمة..."
for file in "${IMPORTANT_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ إضافة: $file"
        git add -f "$file" 2>/dev/null || echo "  ⚠️  لا يمكن إضافة: $file"
    fi
done

# إضافة جميع الملفات
echo "📦 إضافة جميع الملفات..."
git add .

# عرض حالة الملفات
echo "📋 حالة الملفات:"
echo "✅ الملفات التي تم إضافتها:"
git status --porcelain | grep "^A" | cut -c4- | head -15

echo "🚫 الملفات التي تم تجاهلها:"
git status --ignored | grep "^!!" | cut -c4- | head -10

# التحقق من وجود ملفات للإضافة
if ! git diff --cached --quiet; then
    echo "💾 إنشاء commit..."
    git commit -m "feat: إضافة المشروع الأساسي

- إضافة جميع ملفات المشروع في جذر المستودع
- إضافة ملفات التكوين المهمة
- إعداد Git repository"
else
    echo "⚠️  لا توجد ملفات جديدة للإضافة"
fi

# إنشاء مستودع على GitHub
if [ "$USE_GH_CLI" = true ]; then
    echo "🌐 إنشاء مستودع على GitHub..."
    
    # التحقق من تسجيل الدخول
    if ! gh auth status &>/dev/null; then
        echo "🔐 تسجيل الدخول إلى GitHub..."
        gh auth login
    fi
    
    read -p "أدخل اسم المستودع: " REPO_NAME
    read -p "أدخل وصف المستودع (اختياري): " REPO_DESCRIPTION
    read -p "هل تريد أن يكون المستودع عاماً؟ (y/n): " REPO_PUBLIC
    
    if [ "$REPO_PUBLIC" = "y" ]; then
        gh repo create "$REPO_NAME" --description "$REPO_DESCRIPTION" --public --source=. --remote=origin --push
    else
        gh repo create "$REPO_NAME" --description "$REPO_DESCRIPTION" --private --source=. --remote=origin --push
    fi
    
else
    echo "🌐 إنشاء مستودع على GitHub..."
    echo "يرجى إنشاء مستودع جديد على GitHub يدوياً"
    echo "ثم أدخل رابط المستودع:"
    read -p "رابط المستودع: " REPO_URL
    
    if [ -n "$REPO_URL" ]; then
        git remote add origin "$REPO_URL"
        git branch -M main
        git push -u origin main
    else
        echo "❌ لم يتم إدخال رابط المستودع"
        exit 1
    fi
fi

# إنشاء ملفات إضافية مفيدة
echo "📄 إنشاء ملفات إضافية..."

# إنشاء README.md إذا لم يكن موجوداً
if [ ! -f "README.md" ]; then
    cat > README.md << 'EOF'
# اسم المشروع

وصف مختصر للمشروع.

## التثبيت

```bash
npm install
# أو
yarn install
# أو
pnpm install
```

## الاستخدام

```bash
npm start
# أو
yarn start
# أو
pnpm start
```

## الميزات

- ميزة 1
- ميزة 2
- ميزة 3

## المساهمة

يرجى قراءة [دليل المساهمة](CONTRIBUTING.md) للمزيد من التفاصيل.

## الترخيص

هذا المشروع مرخص تحت رخصة MIT - انظر ملف [LICENSE](LICENSE) للتفاصيل.
EOF
    git add README.md
    git commit -m "docs: إضافة README.md"
fi

# إنشاء LICENSE إذا لم يكن موجوداً
if [ ! -f "LICENSE" ]; then
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
    git add LICENSE
    git commit -m "docs: إضافة LICENSE"
fi

# رفع التغييرات
if [ "$USE_GH_CLI" = false ]; then
    git push
fi

echo ""
echo "🎉 تم إكمال عملية رفع المشروع إلى GitHub بنجاح!"
echo ""
echo "📋 ملخص ما تم إنجازه:"
echo "✅ إعداد Git"
echo "✅ تهيئة المستودع المحلي"
echo "✅ إضافة الملفات المهمة"
echo "✅ إنشاء مستودع على GitHub"
echo "✅ رفع الكود مباشرة في جذر المستودع"
echo "✅ إنشاء ملفات README و LICENSE"
echo ""
echo "📁 الملفات التي تم رفعها في جذر المستودع:"
git ls-files | head -20
if [ $(git ls-files | wc -l) -gt 20 ]; then
    echo "... والمزيد من الملفات"
fi
echo ""
echo "🔗 يمكنك الآن الوصول إلى مشروعك على GitHub!"
echo "📂 جميع الملفات ستظهر مباشرة في جذر المستودع (بدون مجلدات فرعية)"
echo ""
echo "📝 الخطوات التالية:"
echo "1. تحديث README.md بمعلومات مشروعك"
echo "2. إضافة الكود الفعلي للمشروع"
echo "3. إعداد CI/CD إذا لزم الأمر"
echo "4. إضافة الاختبارات"
echo ""
echo "شكراً لاستخدام السكريبت المباشر! 🚀"
