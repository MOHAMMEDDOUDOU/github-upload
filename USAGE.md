# دليل استخدام نظام رفع المشروع إلى GitHub

## 📋 نظرة عامة

هذا النظام يتضمن جميع الملفات والأدوات اللازمة لرفع مشروعك إلى GitHub بسهولة وأمان.

## 📁 الملفات المرفقة

### 1. `.gitignore`
ملف شامل لتجاهل الملفات غير المرغوب فيها عند رفع المشروع. يتضمن:
- ملفات النظام والبيئة
- ملفات التطوير والبناء
- ملفات IDE والمحررات
- ملفات التبعيات والكاش
- ملفات الاختبار والتغطية

### 2. `README.md`
قالب شامل لملف README يتضمن:
- وصف المشروع والمميزات
- تعليمات التثبيت والتشغيل
- هيكل المشروع
- التقنيات المستخدمة
- دليل المساهمة
- معلومات التواصل

### 3. `setup-github.sh`
سكريبت شامل لرفع المشروع إلى GitHub يتضمن:
- إعداد Git تلقائياً
- إنشاء مستودع على GitHub (مع GitHub CLI أو يدوياً)
- رفع الكود
- إنشاء ملفات إضافية (LICENSE, CONTRIBUTING)
- إنشاء package.json إذا لم يكن موجوداً

### 4. `quick-upload.sh`
سكريبت مبسط للرفع السريع:
- إعداد سريع لـ Git
- رفع مباشر للكود
- مناسب للمشاريع البسيطة

## 🚀 كيفية الاستخدام

### الطريقة الأولى: السكريبت الشامل

1. **تأكد من تثبيت Git:**
```bash
git --version
```

2. **اختياري: تثبيت GitHub CLI:**
```bash
# على macOS
brew install gh

# على Ubuntu/Debian
sudo apt install gh

# على Windows
winget install GitHub.cli
```

3. **تشغيل السكريبت الشامل:**
```bash
chmod +x setup-github.sh
./setup-github.sh
```

4. **اتباع التعليمات على الشاشة**

### الطريقة الثانية: الرفع السريع

1. **تشغيل السكريبت السريع:**
```bash
chmod +x quick-upload.sh
./quick-upload.sh
```

2. **إدخال رابط المستودع عند الطلب**

### الطريقة الثالثة: الرفع اليدوي

1. **تهيئة Git:**
```bash
git init
git add .
git commit -m "Initial commit"
```

2. **إضافة remote origin:**
```bash
git remote add origin https://github.com/username/repo-name.git
```

3. **رفع الكود:**
```bash
git branch -M main
git push -u origin main
```

## 📝 تخصيص الملفات

### تخصيص README.md

1. **تحديث اسم المشروع:**
```markdown
# اسم مشروعك الحقيقي
```

2. **تحديث الوصف:**
```markdown
وصف مفصل لمشروعك وأهدافه
```

3. **تحديث التقنيات المستخدمة:**
```markdown
- **Frontend**: React/Vue/Angular
- **Backend**: Node.js/Express
- **Database**: MongoDB/PostgreSQL
```

4. **تحديث معلومات التواصل:**
```markdown
- البريد الإلكتروني: your.real.email@example.com
- GitHub: [username](https://github.com/username)
```

### تخصيص .gitignore

يمكنك إضافة أو إزالة قواعد حسب احتياجات مشروعك:

```gitignore
# إضافة ملفات خاصة بمشروعك
my-special-file.txt
custom-folder/

# إزالة قواعد لا تحتاجها
# node_modules/
```

## 🔧 إعدادات إضافية

### إعداد GitHub CLI

1. **تسجيل الدخول:**
```bash
gh auth login
```

2. **إنشاء مستودع جديد:**
```bash
gh repo create my-project --public --description "My awesome project"
```

### إعداد SSH Keys (اختياري)

1. **إنشاء مفتاح SSH:**
```bash
ssh-keygen -t ed25519 -C "your.email@example.com"
```

2. **إضافة المفتاح إلى GitHub:**
```bash
cat ~/.ssh/id_ed25519.pub
# انسخ المحتوى وأضفه في GitHub Settings > SSH and GPG keys
```

## 🛠️ استكشاف الأخطاء

### مشكلة: Git غير مثبت
```bash
# على macOS
brew install git

# على Ubuntu/Debian
sudo apt install git

# على Windows
winget install Git.Git
```

### مشكلة: GitHub CLI غير مثبت
```bash
# على macOS
brew install gh

# على Ubuntu/Debian
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install gh
```

### مشكلة: رفض الاتصال
```bash
# التحقق من إعدادات Git
git config --list

# إعادة تعيين إعدادات Git
git config --global --unset user.name
git config --global --unset user.email
```

### مشكلة: رفض Push
```bash
# التحقق من الصلاحيات
gh auth status

# إعادة تسجيل الدخول
gh auth logout
gh auth login
```

## 📚 موارد إضافية

- [GitHub Docs](https://docs.github.com/)
- [Git Handbook](https://guides.github.com/introduction/git-handbook/)
- [GitHub CLI Docs](https://cli.github.com/)
- [Git Cheat Sheet](https://education.github.com/git-cheat-sheet-education.pdf)

## 🤝 المساعدة

إذا واجهت أي مشاكل أو لديك أسئلة:

1. تحقق من [GitHub Status](https://www.githubstatus.com/)
2. راجع [GitHub Help](https://help.github.com/)
3. ابحث في [GitHub Community](https://github.community/)

---

**ملاحظة:** تأكد من تحديث جميع المعلومات الشخصية في الملفات قبل رفع المشروع! 