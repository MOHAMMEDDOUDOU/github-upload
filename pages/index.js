import { useState } from "react";

export default function Home() {
  const [repo, setRepo] = useState("");
  const [token, setToken] = useState("");
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [repoUrl, setRepoUrl] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setRepoUrl("");
    if (!file || !repo || !token) {
      setStatus("يرجى تعبئة جميع الحقول");
      return;
    }
    setStatus("جاري إنشاء المستودع ورفع الملفات...");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("repo", repo);
    formData.append("token", token);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setStatus("✅ تم رفع المشروع بنجاح!");
        if (data.repoUrl) setRepoUrl(data.repoUrl);
      } else {
        setStatus(`❌ خطأ: ${data.message}`);
      }
    } catch (error) {
      setStatus(`❌ خطأ في الاتصال: ${error.message}`);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "auto", padding: 32 }}>
      <h2>رفع مشروع إلى GitHub</h2>
      <p style={{ color: "#666", fontSize: "14px", marginBottom: "20px" }}>
        ارفع ملف zip لمشروعك وستظهر الملفات مباشرة في جذر المستودع
      </p>
      <div style={{ backgroundColor: "#f8f9fa", padding: "15px", borderRadius: "5px", marginBottom: "20px", fontSize: "14px" }}>
        <strong>كيفية الاستخدام:</strong><br/>
        1. اضغط "اختيار ملف" واختر ملف zip لمشروعك<br/>
        2. أدخل اسم المستودع (مثل: my-project)<br/>
        3. أدخل GitHub Personal Access Token<br/>
        4. اضغط "رفع" وانتظر حتى يتم الرفع
      </div>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>ملف المشروع (zip):</label>
          <input type="file" accept=".zip" onChange={e => setFile(e.target.files[0])} />
        </div>
        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>اسم المستودع (repo):</label>
          <input type="text" value={repo} onChange={e => setRepo(e.target.value)} style={{ width: "100%", padding: "8px" }} />
        </div>
        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>GitHub Token:</label>
          <input type="password" value={token} onChange={e => setToken(e.target.value)} style={{ width: "100%", padding: "8px" }} />
        </div>
        <button type="submit" style={{marginTop: 10, padding: "10px 20px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "5px", cursor: "pointer"}}>رفع</button>
      </form>
      <div style={{ marginTop: 16, color: status.includes("✅") ? "green" : status.includes("❌") ? "red" : "blue" }}>{status}</div>
      {repoUrl && (
        <div style={{ marginTop: 8 }}>
          <a href={repoUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#007bff" }}>رابط المستودع على GitHub</a>
        </div>
      )}
    </div>
  );
}