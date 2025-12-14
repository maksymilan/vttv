import React, { useState } from 'react';
import axios from 'axios';

const API_BASE = "http://localhost:8000/api";

function App() {
  const [videoFile, setVideoFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [statusText, setStatusText] = useState("");

  const handleGenerate = async () => {
    if (!videoFile) return alert("请先选择视频文件");
    
    setLoading(true);
    setStatusText("正在上传视频并进行AI分析（耗时较长，请耐心等待）...");
    setDownloadUrl("");

    const formData = new FormData();
    formData.append("file", videoFile);

    try {
      // 设置较长的超时时间，因为视频生成很慢
      const response = await axios.post(`${API_BASE}/generate`, formData, {
        timeout: 300000 
      });

      if (response.data.status === "success") {
        setStatusText("生成成功！");
        setDownloadUrl(`${API_BASE}${response.data.download_url}`);
      }
    } catch (error) {
      console.error(error);
      setStatusText("发生错误，请检查后端日志。");
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshRAG = async () => {
    try {
      await axios.post(`${API_BASE}/refresh_rag`);
      alert("知识库已重新初始化 (请确保 backend/data/knowledge.pdf 存在)");
    } catch (e) {
      alert("刷新失败");
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial, sans-serif", maxWidth: "800px", margin: "0 auto" }}>
      <h1>AI 康复动作视频生成器</h1>
      <p>流程：上传视频 - AI理解 - RAG检索(基于本地PDF) - 生成解说视频</p>

      <div style={{ background: "#f0f0f0", padding: "1rem", borderRadius: "8px", marginBottom: "1rem" }}>
        <h3>1. 知识库状态</h3>
        <p>系统启动时已自动加载 backend/data/knowledge.pdf</p>
        <button onClick={handleRefreshRAG} style={{ padding: "0.5rem 1rem", cursor: "pointer" }}>
          手动刷新知识库 (如果你替换了PDF)
        </button>
      </div>

      <div style={{ background: "#e6f7ff", padding: "1rem", borderRadius: "8px" }}>
        <h3>2. 生成视频</h3>
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
        <div style={{ marginTop: "2rem" }}>
          <h3>生成结果预览：</h3>
          <video controls width="100%" src={downloadUrl} style={{ borderRadius: "8px", border: "1px solid #ccc" }} />
          <br />
          <a href={downloadUrl} download="result.mp4" style={{ display: "block", marginTop: "0.5rem" }}>
            下载视频文件
          </a>
        </div>
      )}
    </div>
  );
}

export default App;