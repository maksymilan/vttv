## 1. 项目概述

本项目是一个基于多模态大模型（Gemini/GPT）和 RAG（检索增强生成）技术的视频生成系统。
**核心流程**：用户上传动作视频 -> AI 视觉理解 -> **在扩充后的知识库中检索专业建议** -> 生成带语音解说的演示视频。

---

## 2. 快速启动指南 (Startup Guide)

### 2.1 后端启动 (Python FastAPI)

1. **进入目录**：
```bash
cd vttv/backend

```


2. **环境配置**：
* 确保已创建 `.env` 文件 (参考 `uploaded:vttv/backend/.env`)，并填入正确的 API Key：
```ini
AIHUBMIX_API_KEY=your_api_key_here
AIHUBMIX_BASE_URL=https://aihubmix.com/v1

```




3. **安装依赖**：
```bash
pip install -r requirements.txt

```


*(依赖包含 `fastapi`, `uvicorn`, `google-genai`, `langchain`, `chromadb`, `moviepy`, `edge-tts` 等)*
4. **启动服务**：
```bash
# 开发模式启动，支持代码热重载
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

```


* 启动成功后，API 文档地址：`http://localhost:8000/docs`



### 2.2 前端启动 (React + Vite)

1. **进入目录**：
```bash
cd vttv/frontend

```


2. **安装依赖**：
```bash
npm install
# 需确保安装 axios
npm install axios

```


3. **启动服务**：
```bash
npm run dev

```


* 前端默认运行在：`http://localhost:5173`



---

## 3. 后端接口文档 (Backend API)

* **Base URL**: `http://localhost:8000`
* **API Prefix**: `/api`

### 3.1 上传知识库文档 (Add Knowledge)

用于上传新的 PDF 文档，系统会将其切片并追加到现有的向量数据库中，实现语料库扩充。

* **Endpoint**: `POST /api/add_knowledge`
* **Content-Type**: `multipart/form-data`

| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `file` | `File` | 是 | PDF 文档文件 |

**响应示例 (Success 200)**:

```json
{
  "status": "success",
  "message": "文档 'guide_v2.pdf' 已成功加入知识库，语料库已扩大。"
}

```

**逻辑说明**：

1. 文件被保存到 `backend/data/` 目录。
2. 调用 `rag_engine.add_pdf()` 进行增量向量化。
3. 原有 ChromaDB 数据保留，新数据追加。

### 3.2 视频生成 (Generate Video)

核心业务接口。上传视频，AI 进行理解、检索知识库并生成新视频。

* **Endpoint**: `POST /api/generate`
* **Content-Type**: `multipart/form-data`

| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `file` | `File` | 是 | 原始康复动作视频 (.mp4) |

**响应示例 (Success 200)**:

```json
{
  "status": "success",
  "download_url": "/api/download/550e8400-e29b-41d4-a716-446655440000"
}

```

**逻辑说明**：

1. **视觉理解**：调用 Google GenAI 接口直接分析视频流。
2. **RAG 检索**：在扩充后的知识库中查询动作相关禁忌/要点。
3. **生成**：合成 PPT 图片 + Edge-TTS 语音 + FFmpeg 剪辑。

### 3.3 下载视频 (Download)

获取生成好的视频文件。

* **Endpoint**: `GET /api/download/{session_id}`

| 参数 (Path) | 类型 | 说明 |
| --- | --- | --- |
| `session_id` | `String` | 生成接口返回的 UUID |

**响应**: 二进制视频流 (`video/mp4`)。

### 3.4 刷新知识库连接 (Refresh RAG)

手动重置/重新加载向量数据库连接（通常用于调试或冷启动）。

* **Endpoint**: `POST /api/refresh_rag`

**响应示例**:

```json
{
  "status": "success",
  "message": "知识库连接已刷新"
}

```

---

## 4. 前端调用指南 (Frontend Integration)

### 4.1 核心配置

在 `src/App.jsx` 中，建议定义统一的 HOST 变量，避免路径拼接错误。

```javascript
const API_HOST = "http://localhost:8000";

```

### 4.2 调用示例代码

#### A. 知识库上传 (对应 /api/add_knowledge)

```javascript
const handleAddKnowledge = async () => {
  const formData = new FormData();
  formData.append("file", pdfFile); // pdfFile 为 input type="file" 获取的 File 对象

  try {
    const res = await axios.post(`${API_HOST}/api/add_knowledge`, formData);
    if (res.data.status === "success") {
      alert("上传成功，知识库已更新！");
    }
  } catch (err) {
    console.error("上传失败", err);
  }
};

```

#### B. 视频生成 (对应 /api/generate)

**注意**：视频生成耗时较长（LLM 分析 + 视频渲染），务必设置较长的 `timeout`。

```javascript
const handleGenerate = async () => {
  const formData = new FormData();
  formData.append("file", videoFile);

  try {
    const res = await axios.post(`${API_HOST}/api/generate`, formData, {
      timeout: 300000 // 设置 300秒超时
    });

    if (res.data.status === "success") {
      // 拼接完整的下载链接
      const videoUrl = `${API_HOST}${res.data.download_url}`;
      setDownloadUrl(videoUrl);
    }
  } catch (err) {
    console.error("生成超时或失败", err);
  }
};

```

---

## 5. 目录结构说明

```text
vttv/
├── backend/
│   ├── app/
│   │   ├── api/endpoints.py    # 定义了上述所有接口
│   │   ├── core/rag_engine.py  # RAG 引擎 (pdf 处理逻辑)
│   │   ├── service/
│   │   │   ├── video_llm.py    # 视频理解逻辑
│   │   │   └── video_producer.py # 视频合成逻辑
│   ├── data/                   # 存放上传的 PDF 和 ChromaDB 数据库文件
│   └── temp/                   # 存放生成的临时视频文件
└── frontend/
    └── src/App.jsx             # 前端 UI 与交互逻辑

```

## 6. 常见问题 (FAQ)

1. **Q: 上传新文档后，旧文档还在吗？**
* **A**: 在。`rag_engine.add_pdf` 使用 `add_documents` 方法，只是向 ChromaDB 追加新向量，不会删除旧数据。


2. **Q: 为什么视频生成这么慢？**
* **A**: 该过程涉及：上传视频 -> 大模型视觉推理 (约10-20秒) -> 语音合成 -> 视频帧渲染 (MoviePy 较慢，约30-60秒)。这是正常现象，前端需显示 Loading 状态。


3. **Q: 报错 `404 Video not found`？**
* **A**: 检查后端 `backend/temp/{session_id}/` 目录下是否生成了 `final_output.mp4`。如果生成失败，通常是 ffmpeg 或 字体路径问题，请查看后端控制台报错。