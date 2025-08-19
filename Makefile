# Makefile لنظام رفع المشروع إلى GitHub
# GitHub Project Upload System Makefile

.PHONY: help setup quick-upload init-git install-deps clean

# الألوان للطباعة
GREEN = \033[0;32m
YELLOW = \033[1;33m
RED = \033[0;31m
NC = \033[0m # No Color

help: ## عرض قائمة الأوامر المتاحة
	@echo "$(GREEN)نظام رفع المشروع إلى GitHub$(NC)"
	@echo "================================"
	@echo ""
	@echo "$(YELLOW)الأوامر المتاحة:$(NC)"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(GREEN)%-15s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo ""
	@echo "$(YELLOW)مثال للاستخدام:$(NC)"
	@echo "  make setup        # إعداد شامل للمشروع"
	@echo "  make quick-upload # رفع سريع"
	@echo "  make help         # عرض هذه القائمة"

setup: ## إعداد شامل للمشروع (يتطلب GitHub CLI)
	@echo "$(GREEN)🚀 بدء الإعداد الشامل...$(NC)"
	@chmod +x setup-github.sh
	@./setup-github.sh

quick-upload: ## رفع سريع للمشروع
	@echo "$(GREEN)⚡ بدء الرفع السريع...$(NC)"
	@chmod +x quick-upload.sh
	@./quick-upload.sh

init-git: ## تهيئة Git فقط
	@echo "$(GREEN)📝 تهيئة Git...$(NC)"
	@git init
	@git add .
	@git commit -m "Initial commit"
	@echo "$(GREEN)✅ تم تهيئة Git بنجاح$(NC)"

install-deps: ## تثبيت التبعيات المطلوبة
	@echo "$(GREEN)📦 تثبيت التبعيات...$(NC)"
	@if ! command -v git &> /dev/null; then \
		echo "$(RED)❌ Git غير مثبت$(NC)"; \
		echo "يرجى تثبيت Git أولاً:"; \
		echo "  macOS: brew install git"; \
		echo "  Ubuntu: sudo apt install git"; \
		echo "  Windows: winget install Git.Git"; \
		exit 1; \
	fi
	@if ! command -v gh &> /dev/null; then \
		echo "$(YELLOW)⚠️  GitHub CLI غير مثبت$(NC)"; \
		echo "لتثبيت GitHub CLI:"; \
		echo "  macOS: brew install gh"; \
		echo "  Ubuntu: sudo apt install gh"; \
		echo "  Windows: winget install GitHub.cli"; \
	else \
		echo "$(GREEN)✅ GitHub CLI مثبت$(NC)"; \
	fi
	@echo "$(GREEN)✅ جميع التبعيات متوفرة$(NC)"

check-status: ## فحص حالة المشروع
	@echo "$(GREEN)🔍 فحص حالة المشروع...$(NC)"
	@if [ -d ".git" ]; then \
		echo "$(GREEN)✅ Git repository مهيأ$(NC)"; \
		git status --porcelain || echo "$(GREEN)✅ لا توجد تغييرات معلقة$(NC)"; \
	else \
		echo "$(YELLOW)⚠️  Git repository غير مهيأ$(NC)"; \
	fi
	@if [ -f "package.json" ]; then \
		echo "$(GREEN)✅ ملف package.json موجود$(NC)"; \
	else \
		echo "$(YELLOW)⚠️  ملف package.json غير موجود$(NC)"; \
	fi
	@if [ -f "README.md" ]; then \
		echo "$(GREEN)✅ ملف README.md موجود$(NC)"; \
	else \
		echo "$(YELLOW)⚠️  ملف README.md غير موجود$(NC)"; \
	fi

create-repo: ## إنشاء مستودع جديد على GitHub (يتطلب GitHub CLI)
	@echo "$(GREEN)🌐 إنشاء مستودع جديد على GitHub...$(NC)"
	@if ! command -v gh &> /dev/null; then \
		echo "$(RED)❌ GitHub CLI غير مثبت$(NC)"; \
		echo "يرجى تثبيت GitHub CLI أولاً"; \
		exit 1; \
	fi
	@read -p "أدخل اسم المستودع: " repo_name; \
	read -p "أدخل وصف المستودع: " repo_desc; \
	read -p "هل تريد أن يكون المستودع عاماً؟ (y/n): " repo_public; \
	if [ "$$repo_public" = "y" ]; then \
		gh repo create "$$repo_name" --description "$$repo_desc" --public; \
	else \
		gh repo create "$$repo_name" --description "$$repo_desc" --private; \
	fi

push-changes: ## رفع التغييرات إلى GitHub
	@echo "$(GREEN)⬆️  رفع التغييرات...$(NC)"
	@if [ ! -d ".git" ]; then \
		echo "$(RED)❌ Git repository غير مهيأ$(NC)"; \
		echo "يرجى تشغيل: make init-git"; \
		exit 1; \
	fi
	@git add .
	@git commit -m "Update: $(shell date)"
	@git push origin main
	@echo "$(GREEN)✅ تم رفع التغييرات بنجاح$(NC)"

setup-ssh: ## إعداد SSH Keys للاتصال الآمن
	@echo "$(GREEN)🔐 إعداد SSH Keys...$(NC)"
	@if [ ! -f ~/.ssh/id_ed25519 ]; then \
		echo "إنشاء مفتاح SSH جديد..."; \
		ssh-keygen -t ed25519 -C "your.email@example.com"; \
		echo "$(GREEN)✅ تم إنشاء مفتاح SSH$(NC)"; \
		echo "$(YELLOW)📋 انسخ المفتاح العام وأضفه إلى GitHub:$(NC)"; \
		cat ~/.ssh/id_ed25519.pub; \
	else \
		echo "$(GREEN)✅ مفتاح SSH موجود$(NC)"; \
		echo "$(YELLOW)📋 مفتاح SSH العام:$(NC)"; \
		cat ~/.ssh/id_ed25519.pub; \
	fi

clean: ## تنظيف الملفات المؤقتة
	@echo "$(GREEN)🧹 تنظيف الملفات المؤقتة...$(NC)"
	@find . -name "*.tmp" -delete
	@find . -name "*.log" -delete
	@find . -name ".DS_Store" -delete
	@echo "$(GREEN)✅ تم التنظيف$(NC)"

validate: ## التحقق من صحة الملفات
	@echo "$(GREEN)✅ التحقق من صحة الملفات...$(NC)"
	@if [ -f ".gitignore" ]; then \
		echo "$(GREEN)✅ ملف .gitignore موجود$(NC)"; \
	else \
		echo "$(RED)❌ ملف .gitignore مفقود$(NC)"; \
	fi
	@if [ -f "README.md" ]; then \
		echo "$(GREEN)✅ ملف README.md موجود$(NC)"; \
	else \
		echo "$(RED)❌ ملف README.md مفقود$(NC)"; \
	fi
	@if [ -f "setup-github.sh" ]; then \
		echo "$(GREEN)✅ ملف setup-github.sh موجود$(NC)"; \
	else \
		echo "$(RED)❌ ملف setup-github.sh مفقود$(NC)"; \
	fi
	@if [ -f "quick-upload.sh" ]; then \
		echo "$(GREEN)✅ ملف quick-upload.sh موجود$(NC)"; \
	else \
		echo "$(RED)❌ ملف quick-upload.sh مفقود$(NC)"; \
	fi

# أمر افتراضي
.DEFAULT_GOAL := help 