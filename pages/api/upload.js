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
  try {
    console.log(`[env] runtime=${process.env.NEXT_RUNTIME || 'node'} netlify=${process.env.NETLIFY ? 'true' : 'false'} node=${process.version} tmp=${os.tmpdir()}`);
  } catch {}
  try {
    console.log(`[env] runtime=${process.env.NEXT_RUNTIME || 'node'} netlify=${process.env.NETLIFY ? 'true' : 'false'} node=${process.version} tmp=${os.tmpdir()}`);
  } catch {}
  try {
    console.log(`[env] runtime=${process.env.NEXT_RUNTIME || 'node'} netlify=${process.env.NETLIFY ? 'true' : 'false'} node=${process.version} tmp=${os.tmpdir()}`);
  } catch {}
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

    // بدلاً من رفع كل ملف على حدة (والذي قد يسبب مهلة على Netlify)،
    // سننشئ commit واحد باستخدام Git Data API (blobs + tree + commit + ref)
    let uploadedCount = 0;
    let failedCount = 0;
    try {
      const apiBase = "https://api.github.com";
      const commonHeaders = {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        "User-Agent": "github-upload-system",
      };

      // 1) آخر ref والـ commit وtree الأساسية
      const refRes = await fetch(`${apiBase}/repos/${ownerLogin}/${repoName}/git/refs/heads/${defaultBranch}`, { headers: commonHeaders, timeout: 20000 });
      if (!refRes.ok) {
        const t = await refRes.text();
        throw new Error(`فشل جلب المرجع: ${refRes.status} ${t}`);
      }
      const refJson = await refRes.json();
      const baseCommitSha = refJson?.object?.sha;
      const commitRes = await fetch(`${apiBase}/repos/${ownerLogin}/${repoName}/git/commits/${baseCommitSha}`, { headers: commonHeaders, timeout: 20000 });
      if (!commitRes.ok) {
        const t = await commitRes.text();
        throw new Error(`فشل جلب الـ commit: ${commitRes.status} ${t}`);
      }
      const commitJson = await commitRes.json();
      const baseTreeSha = commitJson?.tree?.sha;

      // 2) حضّر الملفات المرئية ضمن الحجم
      const fileEntries = [];
      for (const filePath of files) {
        const relPath = path.relative(projectDir, filePath).replace(/\\/g, "/");
        if (relPath.startsWith('.') || relPath.includes('/.')) continue;
        const raw = fs.readFileSync(filePath);
        if (raw.length > 100 * 1024 * 1024) { // 100MB
          console.log(`🚫 تجاهل الملف الكبير: ${relPath}`);
          continue;
        }
        const b64 = raw.toString('base64');
        fileEntries.push({ relPath, b64 });
      }

      // 3) إنشاء blobs بتوازي محدود
      const limit = async (arr, n, worker) => {
        const results = new Array(arr.length);
        let idx = 0;
        const runners = new Array(Math.min(n, arr.length)).fill(0).map(async () => {
          while (true) {
            const i = idx++;
            if (i >= arr.length) return;
            results[i] = await worker(arr[i], i);
          }
        });
        await Promise.all(runners);
        return results;
      };

      const blobs = await limit(fileEntries, 8, async (f) => {
        const resp = await fetch(`${apiBase}/repos/${ownerLogin}/${repoName}/git/blobs`, {
          method: 'POST',
          headers: commonHeaders,
          body: JSON.stringify({ content: f.b64, encoding: 'base64' }),
          timeout: 20000,
        });
        if (!resp.ok) {
          const t = await resp.text();
          throw new Error(`فشل إنشاء blob لـ ${f.relPath}: ${resp.status} ${t}`);
        }
        const j = await resp.json();
        return { path: f.relPath, sha: j.sha };
      });

      // 4) إنشاء tree جديد من blobs
      const treeRes = await fetch(`${apiBase}/repos/${ownerLogin}/${repoName}/git/trees`, {
        method: 'POST',
        headers: commonHeaders,
        body: JSON.stringify({
          base_tree: baseTreeSha,
          tree: blobs.map((b) => ({ path: b.path, mode: '100644', type: 'blob', sha: b.sha })),
        }),
        timeout: 20000,
      });
      if (!treeRes.ok) {
        const t = await treeRes.text();
        throw new Error(`فشل إنشاء الشجرة: ${treeRes.status} ${t}`);
      }
      const treeJson = await treeRes.json();

      // 5) إنشاء commit جديد
      const commitRes2 = await fetch(`${apiBase}/repos/${ownerLogin}/${repoName}/git/commits`, {
        method: 'POST',
        headers: commonHeaders,
        body: JSON.stringify({ message: 'initial import', tree: treeJson.sha, parents: [baseCommitSha] }),
        timeout: 20000,
      });
      if (!commitRes2.ok) {
        const t = await commitRes2.text();
        throw new Error(`فشل إنشاء الـ commit: ${commitRes2.status} ${t}`);
      }
      const commitJson2 = await commitRes2.json();

      // 6) تحديث المرجع إلى الـ commit الجديد
      const refUpdate = await fetch(`${apiBase}/repos/${ownerLogin}/${repoName}/git/refs/heads/${defaultBranch}`, {
        method: 'PATCH',
        headers: commonHeaders,
        body: JSON.stringify({ sha: commitJson2.sha, force: true }),
        timeout: 20000,
      });
      if (!refUpdate.ok) {
        const t = await refUpdate.text();
        throw new Error(`فشل تحديث المرجع: ${refUpdate.status} ${t}`);
      }

      uploadedCount = fileEntries.length;
      failedCount = 0;
      console.log(`✅ تم الرفع بإنشاء commit واحد: ${uploadedCount} ملف`);
    } catch (e) {
      console.error('❌ فشل الرفع عبر Git Data API:', e?.stack || e);
      return res.status(500).json({ message: 'فشل رفع الملفات عبر Git API. راجع السجلات.' });
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
