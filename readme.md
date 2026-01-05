# VTTV - Video LLM & RAG Project

本项目是一个基于多模态大模型（Gemini/GPT）和 RAG（检索增强生成）技术的视频生成系统。

**核心流程**：用户上传动作视频 -> AI 视觉理解 -> **在扩充后的知识库中检索专业建议** -> 生成带语音解说的演示视频。

---

## 1. 项目结构 (Project Structure)

基于 `backend/app` 的模块化设计：

```text
VTTV/
├── backend/                # 后端服务
│   ├── app/
│   │   ├── api/            # API 路由定义 (endpoints.py)
│   │   ├── core/           # 核心引擎 (rag_engine.py - 向量库检索)
│   │   ├── service/        # 业务逻辑服务
│   │   │   ├── video_llm.py            # 视频视觉理解 (Gemini/GPT)
│   │   │   ├── video_producer.py       # 视频剪辑与合成 (MoviePy/FFmpeg)
│   │   │   ├── custom_embedding.py     # 自定义 Embedding
│   │   │   └── example_video_index.py  # 范例视频索引服务
│   │   ├── config.py       # 全局配置
│   │   └── main.py         # FastAPI 入口
│   ├── scripts/            # 维护与工具脚本 (新)
│   │   ├── rebuild_index.py            # 重建范例视频索引
│   │   ├── reorganize_and_analyze.py   # AI 智能视频整理工具
│   │   └── reorganize_videos.py        # 基础视频文件整理工具
│   ├── data/               # 存放 PDF 文档和 ChromaDB 数据库
│   │   └── 范例视频/        # 范例视频库
│   │       ├── video_index.json    # 视频索引 (自动生成)
│   │       ├── *.mp4              # 视频文件
│   │       └── *.txt              # 标签文件
│   ├── temp/               # 临时生成的视频文件
│   ├── tests/              # 测试脚本 (新)
│   ├── requirements.txt    # Python 依赖
│   └── .env                # 环境变量配置文件
├── frontend/               # 前端应用 (React + Vite)
│   ├── src/                # 源代码
│   ├── package.json
│   └── vite.config.js
├── video_llm.py            # 独立测试脚本
├── 范例视频功能说明.md      # 范例视频详细文档 (新)
├── QUICK_REFERENCE.md      # 快速参考 (新)
├── DEMO_GUIDE.md           # 演示指南 (新)
├── check_system.sh         # 系统健康检查 (新)
└── .gitignore              # Git 忽略规则

```

---

## 2. 快速启动指南 (Startup Guide)

请根据你的操作系统选择对应的启动方式。

### 2.1 后端启动 (Python FastAPI)

#### 🍏 macOS / Linux 用户

1. **进入后端目录并创建虚拟环境**：
```bash
cd backend
python3 -m venv venv
source venv/bin/activate

```


2. **安装依赖**：
```bash
pip install -r requirements.txt

```


3. **配置环境变量**：
复制 `.env.example` (如果有) 或新建 `.env` 文件，填入：
```ini
AIHUBMIX_API_KEY=your_api_key_here
AIHUBMIX_BASE_URL=[https://aihubmix.com/v1](https://aihubmix.com/v1)

```


4. **启动服务**：
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

```



#### 🪟 Windows 用户

1. **进入后端目录**：
打开 PowerShell 或 CMD：
```powershell
cd backend

```


2. **创建并激活虚拟环境**：
```powershell
python -m venv venv
.\venv\Scripts\activate

```


> **注意**：如果运行 `activate` 时报错 "禁止运行脚本"，请先执行以下命令以临时允许脚本运行：
> `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`


3. **安装依赖**：
```powershell
pip install -r requirements.txt

```


4. **配置环境变量**：
在 `backend` 目录下新建名为 `.env` 的文件，并填入 API Key 配置。
5. **启动服务**：
```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

```


* 启动成功后，API 文档地址：`http://localhost:8000/docs`



---

### 2.2 前端启动 (React + Vite)

Windows 和 macOS/Linux 操作一致。

1. **进入前端目录**：
```bash
cd ../frontend
# 如果是新打开的终端，请确保路径是 vttv/frontend

```


2. **安装依赖**：
```bash
npm install

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

用于上传新的 PDF 文档，系统会将其切片并追加到现有的向量数据库中。

* **Endpoint**: `POST /api/add_knowledge`
* **Content-Type**: `multipart/form-data`

| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `file` | `File` | 是 | PDF 文档文件 |

### 3.2 视频生成 (Generate Video)

核心业务接口。上传视频，AI 进行理解、检索知识库并生成新视频。

* **Endpoint**: `POST /api/generate`
* **Content-Type**: `multipart/form-data`

| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `file` | `File` | 是 | 原始康复动作视频 (.mp4) |

**响应示例**:

```json
{
  "status": "success",
  "download_url": "/api/download/550e8400-e29b-..."
}

```

### 3.3 下载视频 (Download)

* **Endpoint**: `GET /api/download/{session_id}`

### 3.4 刷新知识库连接 (Refresh RAG)

手动重置向量数据库连接。

* **Endpoint**: `POST /api/refresh_rag`

### 3.4 范例视频管理 (Example Videos)

#### 新增功能：智能范例视频推荐 (Smart Recommendations)

系统集成了基于 LLM 的智能推荐引擎，能够：
1. **语义理解**: 深入理解用户上传视频的动作特征（如"腰部代偿"、"膝盖内扣"）。
2. **智能匹配**: 不仅仅是关键词匹配，还能根据动作模式推荐最相关的康复训练视频。
3. **混合检索**: 结合向量检索和关键词匹配，确保推荐结果的准确性和多样性。

**相关 API**：

* **搜索范例视频**: `GET /api/example-videos/search?query={关键词}&max_results={数量}`
* **获取视频文件**: `GET /api/example-video/{视频路径}`
* **获取分类列表**: `GET /api/example-videos/categories`
* **获取统计信息**: `GET /api/example-videos/statistics`
* **重建视频索引**: `POST /api/example-videos/rebuild-index`

**使用示例**：
```bash
# 搜索下背痛相关视频
curl "http://localhost:8000/api/example-videos/search?query=下背痛&max_results=5"

# 重建索引（添加新视频后）
curl -X POST http://localhost:8000/api/example-videos/rebuild-index
```

**添加新范例视频**：
1. 将视频文件（.mp4）放入 `backend/data/范例视频/` 目录
2. 创建同名的标签文件（.txt），内容为逗号分隔的标签
3. 调用重建索引API，或运行 `backend/scripts/rebuild_index.py` 脚本

**详细文档**：
- [范例视频功能说明](范例视频功能说明.md)
- [快速参考](QUICK_REFERENCE.md)
- [演示指南](DEMO_GUIDE.md)

---

## 5. 维护脚本 (Maintenance Scripts)

项目在 `backend/scripts/` 目录下提供了一系列实用工具，用于数据管理和系统维护。

### 5.1 重建视频索引 (`rebuild_index.py`)
当手动添加或删除了范例视频文件后，运行此脚本更新 `video_index.json`。
```bash
python backend/scripts/rebuild_index.py
```

### 5.2 智能视频整理 (`reorganize_and_analyze.py`)
使用 Gemini AI 自动分析未分类的视频，生成描述性文件名和标签，并将其移动到合适的分类文件夹中。
```bash
python backend/scripts/reorganize_and_analyze.py
```

### 5.3 基础视频整理 (`reorganize_videos.py`)
基于文件名的规则进行简单的文件夹归档整理。
```bash
python backend/scripts/reorganize_videos.py
```

---

## 4. 前端调用指南 (Frontend Integration)

### 核心配置

在 `src/App.jsx` 或配置文件中：

```javascript
const API_HOST = "http://localhost:8000";

```

### 调用示例 (Axios)

```javascript
// 视频生成请求 (注意设置超时时间)
const handleGenerate = async () => {
  const formData = new FormData();
  formData.append("file", videoFile);

  try {
    const res = await axios.post(`${API_HOST}/api/generate`, formData, {
      timeout: 300000 // 5分钟超时，因为视频渲染较慢
    });
    if (res.data.status === "success") {
      setDownloadUrl(`${API_HOST}${res.data.download_url}`);
    }
  } catch (err) {
    console.error("生成失败", err);
  }
};
```
