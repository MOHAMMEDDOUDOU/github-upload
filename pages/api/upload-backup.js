import AdmZip from "adm-zip";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import os from "os";
import Busboy from "busboy";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  const bb = Busboy({ headers: req.headers });
  let repo = "", token = "", zipBuffer = null;

  bb.on("field", (name, val) => {
    if (name === "repo") repo = val;
    if (name === "token") token = val;
  });
  bb.on("file", (name, file) => {
    const buffers = [];
    file.on("data", (data) => buffers.push(data));
    file.on("end", () => {
      zipBuffer = Buffer.concat(buffers);
    });
  });

  bb.on("finish", async () => {
    if (!repo || !token || !zipBuffer) {
      return res.status(400).json({ message: "بيانات ناقصة" });
    }

    // فك ضغط الملف في مجلد مؤقت
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "upload-"));
    const zip = new AdmZip(zipBuffer);
    zip.extractAllTo(tmpDir, true);
    
    // التحقق من وجود مجلد واحد فقط في الأعلى (مجلد المشروع)
    const topLevelItems = fs.readdirSync(tmpDir);
    let projectDir = tmpDir;
    
    // إذا كان هناك مجلد واحد فقط في الأعلى، انسخ محتوياته إلى المجلد الجذر
    if (topLevelItems.length === 1 && fs.statSync(path.join(tmpDir, topLevelItems[0])).isDirectory()) {
      const subDir = path.join(tmpDir, topLevelItems[0]);
      console.log(`تم اكتشاف مجلد المشروع: ${topLevelItems[0]} - نسخ المحتويات إلى الجذر`);
      
      // نسخ جميع الملفات من المجلد الفرعي إلى المجلد الجذر
      const copyRecursive = (src, dest) => {
        const items = fs.readdirSync(src);
        items.forEach(item => {
          const srcPath = path.join(src, item);
          const destPath = path.join(dest, item);
          const stat = fs.statSync(srcPath);
          
          if (stat.isDirectory()) {
            fs.mkdirSync(destPath, { recursive: true });
            copyRecursive(srcPath, destPath);
          } else {
            fs.copyFileSync(srcPath, destPath);
          }
        });
      };
      
      copyRecursive(subDir, tmpDir);
      // حذف المجلد الفرعي الأصلي
      fs.rmSync(subDir, { recursive: true, force: true });
      console.log(`تم نسخ المحتويات إلى المجلد الجذر وحذف المجلد الفرعي`);
    } else {
      console.log(`استخدام المجلد الجذر مباشرة`);
    }

    // إنشاء مستودع جديد على GitHub
    const createRepoRes = await fetch("https://api.github.com/user/repos", {
      method: "POST",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "github-upload-system"
      },
      body: JSON.stringify({
        name: repo,
        private: false,
        auto_init: true,
      }),
    });
    if (!createRepoRes.ok) {
      return res.status(400).json({ message: "فشل إنشاء المستودع على GitHub" });
    }
    const repoData = await createRepoRes.json();
    const repoUrl = repoData.html_url;

    // رفع الملفات إلى المستودع (ملف ملف عبر GitHub API)
    const walk = (dir) => {
      let results = [];
      const list = fs.readdirSync(dir);
      list.forEach((file) => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
          results = results.concat(walk(file));
        } else {
          results.push(file);
        }
      });
      return results;
    };
    const files = walk(projectDir);

    for (const filePath of files) {
      const content = fs.readFileSync(filePath, { encoding: "base64" });
      const relPath = path.relative(projectDir, filePath).replace(/\\/g, "/");
      
      // تجاهل الملفات المخفية والمجلدات
      if (relPath.startsWith('.') || relPath.includes('/.')) {
        continue;
      }
      
      // تجاهل الملفات الكبيرة جداً (أكبر من 100MB)
      if (content.length > 100 * 1024 * 1024) {
        console.log(`تجاهل الملف الكبير: ${relPath}`);
        continue;
      }
      
      try {
        console.log(`جاري رفع: ${relPath}`);
        // رفع الملف عبر GitHub API
        const uploadRes = await fetch(`https://api.github.com/repos/${repoData.owner.login}/${repo}/contents/${relPath}`, {
          method: "PUT",
          headers: {
            Authorization: `token ${token}`,
            "Content-Type": "application/json",
            "User-Agent": "github-upload-system"
          },
          body: JSON.stringify({
            message: `add ${relPath}`,
            content,
          }),
        });
        
        if (!uploadRes.ok) {
          console.error(`فشل رفع الملف: ${relPath}`);
        } else {
          console.log(`تم رفع: ${relPath}`);
        }
      } catch (error) {
        console.error(`خطأ في رفع الملف ${relPath}:`, error);
      }
    }

    // تنظيف الملفات المؤقتة
    fs.rmSync(tmpDir, { recursive: true, force: true });

    res.status(200).json({ message: "تم رفع المشروع بنجاح!", repoUrl });
  });

  req.pipe(bb);
}