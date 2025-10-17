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

    console.log(`=== بدء معالجة الملف المضغوط للمستودع: ${repo} ===`);

    // فك ضغط الملف في مجلد مؤقت
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "upload-"));
    console.log(`�� تم إنشاء المجلد المؤقت: ${tmpDir}`);
    
    const zip = new AdmZip(zipBuffer);
    zip.extractAllTo(tmpDir, true);
    console.log(`📦 تم استخراج الملف المضغوط`);
    
    // التحقق من وجود مجلد واحد فقط في الأعلى (مجلد المشروع)
    const topLevelItems = fs.readdirSync(tmpDir);
    console.log(`📋 المحتويات في المجلد المؤقت:`, topLevelItems);
    
    let projectDir = tmpDir;
    
    // إذا كان هناك مجلد واحد فقط في الأعلى، انسخ محتوياته إلى المجلد الجذر
    if (topLevelItems.length === 1 && fs.statSync(path.join(tmpDir, topLevelItems[0])).isDirectory()) {
      const subDir = path.join(tmpDir, topLevelItems[0]);
      console.log(`🔍 تم اكتشاف مجلد المشروع: ${topLevelItems[0]}`);
      console.log(`📂 مسار المجلد الفرعي: ${subDir}`);
      
      // عرض محتويات المجلد الفرعي
      const subDirContents = fs.readdirSync(subDir);
      console.log(`📋 محتويات المجلد الفرعي:`, subDirContents);
      
      // نسخ جميع الملفات من المجلد الفرعي إلى المجلد الجذر
      const copyRecursive = (src, dest) => {
        const items = fs.readdirSync(src);
        console.log(`📄 نسخ ${items.length} عنصر من ${src} إلى ${dest}`);
        
        items.forEach(item => {
          const srcPath = path.join(src, item);
          const destPath = path.join(dest, item);
          const stat = fs.statSync(srcPath);
          
          if (stat.isDirectory()) {
            console.log(`📁 إنشاء مجلد: ${destPath}`);
            fs.mkdirSync(destPath, { recursive: true });
            copyRecursive(srcPath, destPath);
          } else {
            console.log(`📄 نسخ ملف: ${srcPath} → ${destPath}`);
            fs.copyFileSync(srcPath, destPath);
          }
        });
      };
      
      copyRecursive(subDir, tmpDir);
      
      // حذف المجلد الفرعي الأصلي
      console.log(`🗑️ حذف المجلد الفرعي الأصلي: ${subDir}`);
      fs.rmSync(subDir, { recursive: true, force: true });
      
      // التحقق من المحتويات بعد النسخ
      const finalContents = fs.readdirSync(tmpDir);
      console.log(`✅ المحتويات النهائية في المجلد الجذر:`, finalContents);
    } else {
      console.log(`📂 استخدام المجلد الجذر مباشرة`);
    }

    // إنشاء مستودع جديد على GitHub
    console.log(`🌐 إنشاء مستودع جديد على GitHub: ${repo}`);
    const createRepoRes = await fetch("https://api.github.com/user/repos", {
      method: "POST",
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        "User-Agent": "github-upload-system",
      },
      body: JSON.stringify({
        name: repo,
        private: false,
        // يجب تهيئة المستودع لخلق الفرع الافتراضي حتى نتمكن من رفع الملفات عبر API
        auto_init: true,
      }),
    });
    
    if (!createRepoRes.ok) {
      const errorText = await createRepoRes.text();
      console.error(`❌ فشل إنشاء المستودع:`, errorText);
      let human = "فشل إنشاء المستودع على GitHub";
      try {
        const parsed = JSON.parse(errorText);
        if (parsed && parsed.message) human = `فشل إنشاء المستودع: ${parsed.message}`;
      } catch {}
      return res.status(400).json({ message: human });
    }
    
    const repoData = await createRepoRes.json();
    const repoUrl = repoData.html_url;
    const ownerLogin = repoData?.owner?.login;
    const repoName = repoData?.name; // الاسم الفعلي بعد تهيئة GitHub (قد يحول المسافات إلى شرطات)
    const defaultBranch = repoData?.default_branch || "main";
    console.log(`✅ تم إنشاء المستودع: ${repoUrl}`);
    console.log(`ℹ️ الرفع إلى: ${ownerLogin}/${repoName} على الفرع ${defaultBranch}`);

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
    console.log(`📊 تم العثور على ${files.length} ملف للرفع`);
    console.log(`📁 المجلد الجذر: ${projectDir}`);
    console.log(`📋 قائمة الملفات:`, files.map(f => path.relative(projectDir, f)));

    let uploadedCount = 0;
    let failedCount = 0;

    for (const filePath of files) {
      const content = fs.readFileSync(filePath, { encoding: "base64" });
      const relPath = path.relative(projectDir, filePath).replace(/\\/g, "/");
      
      // تجاهل الملفات المخفية والمجلدات
      if (relPath.startsWith('.') || relPath.includes('/.')) {
        console.log(`🚫 تجاهل الملف المخفي: ${relPath}`);
        continue;
      }
      
      // تجاهل الملفات الكبيرة جداً (أكبر من 100MB)
      if (content.length > 100 * 1024 * 1024) {
        console.log(`🚫 تجاهل الملف الكبير: ${relPath}`);
        continue;
      }
      
      try {
        console.log(`⬆️ جاري رفع: ${relPath}`);
        // رفع الملف عبر GitHub API
        const contentUrl = encodeURI(`https://api.github.com/repos/${ownerLogin}/${repoName}/contents/${relPath}`);
        const jsonHeaders = {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
          "User-Agent": "github-upload-system",
        };
        const basePayload = {
          message: `add ${relPath}`,
          content,
          // ارفع على الفرع الافتراضي بوضوح
          branch: defaultBranch,
        };
        let uploadRes = await fetch(contentUrl, {
          method: "PUT",
          headers: jsonHeaders,
          body: JSON.stringify(basePayload),
        });
        
        if (!uploadRes.ok) {
          // إذا كان الملف موجودًا مسبقًا (مثلاً README عند التهيئة)، حاول التحديث بدلاً من الإنشاء
          if (uploadRes.status === 409 || uploadRes.status === 422) {
            try {
              const getRes = await fetch(`${contentUrl}?ref=${encodeURIComponent(defaultBranch)}`, {
                method: "GET",
                headers: jsonHeaders,
              });
              if (getRes.ok) {
                const fileMeta = await getRes.json();
                const sha = fileMeta?.sha;
                if (sha) {
                  const updateRes = await fetch(contentUrl, {
                    method: "PUT",
                    headers: jsonHeaders,
                    body: JSON.stringify({
                      message: `update ${relPath}`,
                      content,
                      branch: defaultBranch,
                      sha,
                    }),
                  });
                  if (updateRes.ok) {
                    console.log(`♻️ تم تحديث: ${relPath}`);
                    uploadedCount++;
                    continue;
                  } else {
                    const updErr = await updateRes.text();
                    console.error(`❌ فشل تحديث الملف: ${relPath}`, updErr);
                  }
                }
              } else {
                const metaErr = await getRes.text();
                console.error(`❌ فشل جلب بيانات الملف قبل التحديث: ${relPath}`, metaErr);
              }
            } catch (e) {
              console.error(`❌ استثناء أثناء محاولة التحديث: ${relPath}`, e);
            }
          }

          // إذا وصلنا هنا فما زال الفشل قائمًا
          const errorData = await uploadRes.text();
          console.error(`❌ فشل رفع الملف: ${relPath}`, errorData);
          failedCount++;
        } else {
          console.log(`✅ تم رفع: ${relPath}`);
          uploadedCount++;
        }
      } catch (error) {
        console.error(`❌ خطأ في رفع الملف ${relPath}:`, error);
        failedCount++;
      }
    }
    
    console.log(`📊 النتيجة النهائية: تم رفع ${uploadedCount} ملف بنجاح، فشل رفع ${failedCount} ملف`);

    // تنظيف الملفات المؤقتة
    fs.rmSync(tmpDir, { recursive: true, force: true });
    console.log(`�� تم تنظيف الملفات المؤقتة`);

    res.status(200).json({ 
      message: `تم رفع المشروع بنجاح! تم رفع ${uploadedCount} ملف`, 
      repoUrl,
      uploadedCount,
      failedCount
    });
  });

  req.pipe(bb);
}
