import React, { useState } from 'react';
import axios from 'axios';

// 建议将 API 地址改为只指向 host，避免拼接重复
// 或者保持原样，但在调用时注意路径
const API_HOST = "http://localhost:8000"; 

function App() {
  const [videoFile, setVideoFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ragLoading, setRagLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [statusText, setStatusText] = useState("");
  const [ragStatus, setRagStatus] = useState("");

  // 上传 PDF 到知识库
  const handleAddKnowledge = async () => {
    if (!pdfFile) return alert("请先选择 PDF 文件");
    
    setRagLoading(true);
    setRagStatus("正在解析 PDF 并加入向量库 (扩大语料)...");
    
    const formData = new FormData();
    formData.append("file", pdfFile);

    try {
      const response = await axios.post(`${API_HOST}/api/add_knowledge`, formData);
      if (response.data.status === "success") {
        setRagStatus(`✅ ${response.data.message}`);
        // 清空选择，方便传下一个
        setPdfFile(null); 
        // 重置 input 的 value 需要 ref 或通过 key 强制刷新，这里简单处理
        document.getElementById("pdfInput").value = "";
      }
    } catch (error) {
      console.error(error);
      setRagStatus("❌ 上传失败: " + (error.response?.data?.detail || error.message));
    } finally {
      setRagLoading(false);
    }
  };

  // 生成视频
  const handleGenerate = async () => {
    if (!videoFile) return alert("请先选择视频文件");
    
    setLoading(true);
    setStatusText("正在上传视频并进行AI分析（耗时较长，请耐心等待）...");
    setDownloadUrl("");

    const formData = new FormData();
    formData.append("file", videoFile);

    try {
      const response = await axios.post(`${API_HOST}/api/generate`, formData, {
        timeout: 300000 // 5分钟超时
      });

      if (response.data.status === "success") {
        setStatusText("生成成功！");
        // 注意路径拼接
        setDownloadUrl(`${API_HOST}${response.data.download_url}`);
      }
    } catch (error) {
      console.error(error);
      setStatusText("❌ 生成失败: " + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial, sans-serif", maxWidth: "800px", margin: "0 auto" }}>
      <h1>AI 康复动作视频生成器</h1>
      <p>上传文档扩大知识库 → 上传视频 → 生成结合专业知识的解说视频</p>

      {/* 区域 1: 知识库管理 (支持多文件) */}
      <div style={{ background: "#f0f0f0", padding: "1.5rem", borderRadius: "8px", marginBottom: "2rem", borderLeft: "5px solid #28a745" }}>
        <h3>📚 知识库管理 (扩充语料)</h3>
        <p style={{fontSize: "0.9rem", color: "#666"}}>
          上传新的 PDF 文档，系统会自动将其加入现有的知识库中。原有文档会被保留。
        </p>
        
        <div style={{ display: "flex", gap: "10px", alignItems: "center", marginTop: "1rem" }}>
          <input 
            id="pdfInput"
            type="file" 
            accept=".pdf" 
            onChange={(e) => setPdfFile(e.target.files[0])} 
          />
          <button 
            onClick={handleAddKnowledge} 
            disabled={ragLoading}
            style={{ 
              padding: "0.5rem 1rem", 
              backgroundColor: ragLoading ? "#ccc" : "#28a745", 
              color: "#fff", 
              border: "none", 
              borderRadius: "4px",
              cursor: ragLoading ? "not-allowed" : "pointer"
            }}
          >
            {ragLoading ? "正在处理..." : "➕ 添加到知识库"}
          </button>
        </div>
        {ragStatus && <p style={{ marginTop: "0.5rem", fontWeight: "bold", color: "#333" }}>{ragStatus}</p>}
      </div>

      {/* 区域 2: 视频生成 */}
      <div style={{ background: "#e6f7ff", padding: "1.5rem", borderRadius: "8px", borderLeft: "5px solid #007bff" }}>
        <h3>🎬 视频生成</h3>
        <input 
          type="file" 
          accept="video/*" 
          onChange={(e) => setVideoFile(e.target.files[0])} 
          style={{ display: "block", marginBottom: "1rem" }}
        />
        
        <button 
          onClick={handleGenerate} 
          disabled={loading}
          style={{ 
            padding: "0.8rem 2rem", 
            fontSize: "1rem", 
            backgroundColor: loading ? "#ccc" : "#007bff", 
            color: "#fff", 
            border: "none", 
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer"
          }}
        >
          {loading ? "AI 处理中..." : "开始生成"}
        </button>
        
        <p style={{ marginTop: "1rem", color: "#666" }}>{statusText}</p>
      </div>

      {downloadUrl && (
        <div style={{ marginTop: "2rem", padding: "1rem", border: "1px solid #ddd", borderRadius: "8px" }}>
          <h3>✅ 生成结果预览：</h3>
          <video controls width="100%" src={downloadUrl} style={{ borderRadius: "8px", background: "#000" }} />
          <div style={{ marginTop: "1rem", textAlign: "right" }}>
            <a 
              href={downloadUrl} 
              download="result.mp4" 
              style={{ 
                textDecoration: "none", 
                background: "#666", 
                color: "white", 
                padding: "8px 16px", 
                borderRadius: "4px" 
              }}
            >
              下载视频文件
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;