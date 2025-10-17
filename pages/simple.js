import { useState } from "react";

export default function SimpleUploader() {
  const [repoName, setRepoName] = useState("");
  const [token, setToken] = useState("");
  const [zipFile, setZipFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!repoName || !token || !zipFile) {
      setError("يرجى إدخال اسم المستودع والتوكن واختيار ملف ZIP.");
      return;
    }

    const formData = new FormData();
    formData.append("repo", repoName.trim());
    formData.append("token", token.trim());
    formData.append("file", zipFile);

    setLoading(true);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.message || "حدث خطأ أثناء الرفع.");
        return;
      }

      setResult({
        message: data?.message || "تم الرفع بنجاح",
        repoUrl: data?.repoUrl || null,
        uploadedCount: data?.uploadedCount,
        failedCount: data?.failedCount,
      });
    } catch (err) {
      setError("تعذر الاتصال بالخادم. حاول مجدداً.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#0f172a",
      padding: "24px",
      color: "#e2e8f0",
      fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif",
    }}>
      <div style={{
        width: "100%",
        maxWidth: 560,
        background: "#111827",
        border: "1px solid #1f2937",
        borderRadius: 12,
        padding: 24,
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
      }}>
        <h1 style={{ marginTop: 0, marginBottom: 8, fontSize: 22 }}>رفع مشروع ZIP إلى GitHub</h1>
        <p style={{ marginTop: 0, marginBottom: 20, color: "#94a3b8" }}>
          أدخل اسم المستودع، التوكن الخاص بـ GitHub، واختر ملف ZIP للمشروع.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label htmlFor="repo" style={{ display: "block", marginBottom: 6 }}>اسم المستودع (repo)</label>
            <input
              id="repo"
              type="text"
              value={repoName}
              onChange={(e) => setRepoName(e.target.value)}
              placeholder="example-repo"
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #334155",
                background: "#0b1220",
                color: "#e2e8f0",
              }}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label htmlFor="token" style={{ display: "block", marginBottom: 6 }}>GitHub Token (PAT)</label>
            <input
              id="token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_**************************"
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #334155",
                background: "#0b1220",
                color: "#e2e8f0",
              }}
            />
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>
              يجب أن يمتلك الصلاحيات: repo (أو repo/public_repo).
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label htmlFor="zip" style={{ display: "block", marginBottom: 6 }}>ملف ZIP</label>
            <input
              id="zip"
              type="file"
              accept=".zip"
              onChange={(e) => setZipFile(e.target.files?.[0] || null)}
              required
              style={{
                width: "100%",
                padding: "8px 0",
                color: "#e2e8f0",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 8,
              border: 0,
              background: loading ? "#1f2937" : "#2563eb",
              color: "white",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 600,
            }}
          >
            {loading ? "جارٍ الرفع..." : "رفع"}
          </button>
        </form>

        {error && (
          <div style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 8,
            background: "#7f1d1d",
            border: "1px solid #991b1b",
            color: "#fecaca",
          }}>
            {error}
          </div>
        )}

        {result && (
          <div style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 8,
            background: "#052e16",
            border: "1px solid #14532d",
            color: "#bbf7d0",
          }}>
            <div style={{ marginBottom: 6 }}>{result.message}</div>
            {typeof result.uploadedCount === "number" && (
              <div>تم رفع: {result.uploadedCount} ملف • فشل: {result.failedCount || 0}</div>
            )}
            {result.repoUrl && (
              <div style={{ marginTop: 6 }}>
                رابط المستودع: {" "}
                <a href={result.repoUrl} target="_blank" rel="noreferrer" style={{ color: "#93c5fd" }}>
                  افتح على GitHub
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
