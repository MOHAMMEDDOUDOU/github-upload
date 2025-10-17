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
  // معلومات بيئية للمساعدة في تتبع مشاكل التشغيل (خاصة Netlify)
  try {
    console.log(
      `[env] runtime=${process.env.NEXT_RUNTIME || 'node'} netlify=${process.env.NETLIFY ? 'true' : 'false'} node=${process.version} tmp=${os.tmpdir()}`
    );
  } catch {}

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
    file.on("error", (err) => {
      console.error("❌ خطأ أثناء قراءة الملف المرفوع:", err?.stack || err);
    });
  });

  bb.on("error", (err) => {
    console.error("❌ خطأ Busboy:", err?.stack || err);
  });

  bb.on("finish", async () => {
    let tmpDir;
    try {
      if (!repo || !token || !zipBuffer) {
        return res.status(400).json({ message: "بيانات ناقصة" });
      }

    console.log(`=== بدء معالجة الملف المضغوط للمستودع: ${repo} ===`);

    // فك ضغط الملف في مجلد مؤقت
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "upload-"));
    console.log(`📁 تم إنشاء المجلد المؤقت: ${tmpDir}`);

    try {
      const zip = new AdmZip(zipBuffer);
      zip.extractAllTo(tmpDir, true);
      console.log(`📦 تم استخراج الملف المضغوط`);
    } catch (e) {
      console.error("❌ فشل استخراج الملف المضغوط:", e?.stack || e);
      return res.status(400).json({ message: "فشل استخراج الملف المضغوط" });
    }
    
    // تحديد المجلد الجذري الفعلي داخل الملف المضغوط مع تسطيح سلاسل المجلد الواحد
    const topLevelItems = fs.readdirSync(tmpDir);
    console.log(`📋 المحتويات في المجلد المؤقت:`, topLevelItems);

    let projectDir = tmpDir;
    const isJunk = (name) => name === '__MACOSX' || name === '.DS_Store' || name.toLowerCase() === 'thumbs.db';
    const isHidden = (name) => name.startsWith('.');
    const isIgnorable = (name) => isHidden(name) || isJunk(name);
    try {
      let currentDir = tmpDir;
      while (true) {
        const entries = fs.readdirSync(currentDir);
        const visible = entries.filter((n) => !isIgnorable(n));
        const dirs = visible.filter((n) => { try { return fs.statSync(path.join(currentDir, n)).isDirectory(); } catch { return false; } });
        const files = visible.filter((n) => { try { return !fs.statSync(path.join(currentDir, n)).isDirectory(); } catch { return false; } });
        console.log(`🔎 في ${currentDir} — مجلدات: ${dirs.length}, ملفات: ${files.length}`);
        if (dirs.length === 1 && files.length === 0) {
          console.log(`➡️ نزول داخل المجلد الوحيد: ${dirs[0]}`);
          currentDir = path.join(currentDir, dirs[0]);
          continue;
        }
        break;
      }
      projectDir = currentDir;
      console.log(`📁 مجلد المشروع المعتمد: ${projectDir}`);
    } catch (e) {
      console.error('⚠️ فشل تحليل بنية المجلد داخل ZIP:', e?.stack || e);
      projectDir = tmpDir;
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
      // مهلة لتفادي تعليق الطلب في بعض بيئات السيرفر
      timeout: 20000,
    });
    console.log(`ℹ️ إنشاء المستودع - الحالة: ${createRepoRes.status}, rate-limit-remaining: ${createRepoRes.headers.get('x-ratelimit-remaining')}`);
    
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
          timeout: 20000,
        });
        
        if (!uploadRes.ok) {
          // إذا كان الملف موجودًا مسبقًا (مثلاً README عند التهيئة)، حاول التحديث بدلاً من الإنشاء
          if (uploadRes.status === 409 || uploadRes.status === 422) {
            try {
              const getRes = await fetch(`${contentUrl}?ref=${encodeURIComponent(defaultBranch)}`, {
                method: "GET",
                headers: jsonHeaders,
                timeout: 20000,
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
                    timeout: 20000,
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
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
      console.log(`🧹 تم تنظيف الملفات المؤقتة`);
    } catch (e) {
      console.error("⚠️ تعذر تنظيف الملفات المؤقتة:", e?.stack || e);
    }

    res.status(200).json({ 
      message: `تم رفع المشروع بنجاح! تم رفع ${uploadedCount} ملف`, 
      repoUrl,
      uploadedCount,
      failedCount
    });
    } catch (fatal) {
      console.error("💥 خطأ غير متوقع في معالج الرفع:", fatal?.stack || fatal);
      return res.status(500).json({ message: "حدث خطأ غير متوقع أثناء المعالجة" });
    }
  });

  req.pipe(bb);
}
