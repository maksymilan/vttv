import React, { useState, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Plus, Upload, ArrowUp, User, LogOut, ChevronLeft, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useLanguageStore } from '../store/useLanguageStore';
import { translations } from '../lib/translations';
import { useChatStore, type ChatMessage } from '../store/useChatStore';

interface HistoryItemProps {
  summary: string;
  active?: boolean;
  onClick?: () => void;
  onDelete?: (e: React.MouseEvent) => void;
}

const HistoryCard: React.FC<HistoryItemProps> = ({ summary, active, onClick, onDelete }) => (
  <div 
    onClick={onClick}
    className={`bg-white/50 rounded-2xl p-4 hover:bg-white transition-colors cursor-pointer border ${active ? 'border-purple-300 bg-white shadow-sm' : 'border-transparent hover:border-purple-100'} hover:shadow-sm group relative`}
  >
    <p className="font-bold text-healink-navy pr-8">{summary}</p>
    {onDelete && (
      <button
        onClick={onDelete}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded"
      >
        <Trash2 className="w-4 h-4 text-red-500" />
      </button>
    )}
  </div>
);

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { language, toggleLanguage } = useLanguageStore();
  const t = translations[language];
  
  const {
    sessions,
    currentSessionId,
    createSession,
    deleteSession,
    setCurrentSession,
    addMessage,
    getCurrentSession,
  } = useChatStore();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [currentMessage, setCurrentMessage] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>("gemini-2.0-flash");
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [clientId] = useState(() => Math.random().toString(36).substring(7));
  const [streamingMessage, setStreamingMessage] = useState<string>("");  // 流式消息临时存储
  const [statusInfo, setStatusInfo] = useState<string>("");  // 后端状态信息
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);  // PDF 上传状态
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);  // 模型选择器展开状态
  const userName = "Alex";  // 用户昵称
  
  // 模型列表配置
  const models = [
    { 
      id: "gemini-2.0-flash", 
      name: "Gemini 2.0 Flash", 
      icon: "⚡", 
      description: "快速响应，适合日常对话"
    },
    { 
      id: "gemini-3-pro-preview", 
      name: "Gemini 3.0 Pro", 
      icon: "✨", 
      description: "最强性能，复杂任务首选"
    }
  ];
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);  // PDF 文件输入
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const currentSessionIdRef = useRef<string | null>(currentSessionId);  // 使用 ref 保存最新的 sessionId
  const streamingMessageRef = useRef<string>("");  // 使用 ref 保存流式消息
  const modelSelectorRef = useRef<HTMLDivElement>(null);  // 模型选择器引用

  // 更新 ref 的值
  useEffect(() => {
    currentSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);
  
  // 同步流式消息到 ref
  useEffect(() => {
    streamingMessageRef.current = streamingMessage;
  }, [streamingMessage]);
  
  // 点击外部关闭模型选择器
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelSelectorRef.current && !modelSelectorRef.current.contains(event.target as Node)) {
        setIsModelSelectorOpen(false);
      }
    };
    
    if (isModelSelectorOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isModelSelectorOpen]);

  const currentSession = getCurrentSession();
  const chatHistory = currentSession?.messages || [];

  // 自动创建第一个会话
  useEffect(() => {
    if (sessions.length === 0) {
      createSession();
    }
  }, []);

  useEffect(() => {
    // Initialize WebSocket connection
    const websocket = new WebSocket(`ws://${window.location.hostname}:8000/api/ws/${clientId}`);
    
    websocket.onopen = () => {
      console.log('✅ WebSocket Connected');
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'chat_start') {
        // AI 开始思考
        console.log('🤔 AI 开始思考...');
        setStatusInfo('🤔 AI 正在思考...');
        setIsChatting(true);
        setStreamingMessage("");  // 清空流式消息
      } else if (data.type === 'chat_stream') {
        // 流式输出片段
        const timestamp = new Date().toISOString();
        console.log(`📡 [${timestamp}] 收到流式片段, chunk长度:`, data.chunk?.length, '完整文本长度:', data.full_text?.length);
        
        // 直接更新显示（后端已经有延迟了）
        flushSync(() => {
          setStreamingMessage(data.full_text || '');
          streamingMessageRef.current = data.full_text;
          setIsChatting(true);
          setStatusInfo('📡 正在生成回复...');
        });
        
        console.log(`📡 [${timestamp}] 已更新显示，消息长度:`, data.full_text?.length);
        
      } else if (data.type === 'chat_response') {
        // 流式输出完成或非流式响应
        console.log('✅ AI 回复完成');
        console.log('📦 最终消息 - data.message:', data.message?.length, 'streamingMessageRef:', streamingMessageRef.current?.length);
        setStatusInfo('✅ 回复完成');
        
        const sessionId = currentSessionIdRef.current;  // 使用 ref 获取最新的 sessionId
        if (sessionId) {
          // 使用 ref 获取最新的流式消息
          const finalMessage = data.message || streamingMessageRef.current;
          console.log('📦 保存消息长度:', finalMessage?.length);
          if (finalMessage) {
            addMessage(sessionId, { 
              role: 'model', 
              type: 'text', 
              content: finalMessage 
            });
          }
        }
        
        // 清空状态
        setIsChatting(false);
        setStreamingMessage("");  // 清空流式消息
        setTimeout(() => setStatusInfo(''), 2000);  // 2秒后清空状态信息
      } else if (data.type === 'progress') {
        console.log("📊 进度更新:", data.message);
        setUploadProgress(data.message);
      } else if (data.type === 'complete') {
        setUploadProgress("完成！");
        setIsUploading(false);
        
        const sessionId = currentSessionIdRef.current;  // 使用 ref 获取最新的 sessionId
        // Add video result to chat
        if (sessionId) {
          addMessage(sessionId, { 
            role: 'model', 
            type: 'video', 
            content: data.download_url 
          });
          
          if (data.text_analysis) {
            addMessage(sessionId, {
              role: 'model',
              type: 'text',
              content: data.text_analysis
            });
          }
        }
        
        setSelectedFile(null);
      } else if (data.type === 'error') {
        console.error('❌ WebSocket 错误:', data.message);
        alert(`Error: ${data.message}`);
        setIsUploading(false);
        setIsChatting(false);
      }
    };

    websocket.onclose = () => {
      console.log('WebSocket Disconnected');
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, [clientId]);  // 只依赖 clientId，不依赖 currentSessionId 和 addMessage

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isChatting, streamingMessage]);  // 添加 streamingMessage 触发滚动

  // 调试：监控流式消息状态
  useEffect(() => {
    console.log('🎨 流式状态变化 - isChatting:', isChatting, 'streamingMessage长度:', streamingMessage.length);
  }, [isChatting, streamingMessage]);

  // 监听对话切换，清空流式状态
  useEffect(() => {
    console.log('🔄 对话切换，清空流式状态');
    setStreamingMessage("");
    setStatusInfo("");
    // 不清空 isChatting，因为可能在后台还在生成
  }, [currentSessionId]);

  const handleSendMessage = () => {
    if (!currentMessage.trim() || !ws || !currentSessionId) return;

    const newMessage: ChatMessage = { role: 'user', type: 'text', content: currentMessage };
    addMessage(currentSessionId, newMessage);
    
    // 清空流式消息和状态，准备接收新的回复
    setStreamingMessage("");
    setIsChatting(true);
    
    console.log('📤 发送消息:', currentMessage);
    
    ws.send(JSON.stringify({
      type: 'chat',
      message: currentMessage,
      model: selectedModel,
      stream: true,  // 启用流式输出
      history: chatHistory.map(msg => ({ 
        role: msg.role, 
        content: msg.type === 'video' ? '[系统已生成康复指导视频]' : msg.content 
      }))
    }));

    setCurrentMessage("");
  };

  const handleSessionClick = (sessionId: string) => {
    setCurrentSession(sessionId);
    // 切换对话时清空流式消息和状态
    setStreamingMessage("");
    setStatusInfo("");
  };

  const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (window.confirm('确定要删除这个对话吗？')) {
      deleteSession(sessionId);
    }
  };

  const handleStartNewAssessment = () => {
    const newSessionId = createSession();
    setCurrentSession(newSessionId);
    // 创建新对话时清空流式消息和状态
    setStreamingMessage("");
    setStatusInfo("");
    setIsChatting(false);
  };

  const handleLogout = () => {
    navigate('/');
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handlePdfUpload = async (file: File) => {
    console.log('📄 开始上传 PDF:', file.name);
    setIsUploadingPdf(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload-pdf', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `上传失败: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ PDF 上传成功:', data);
      alert(`✅ 文档 "${file.name}" 已成功添加到知识库！`);
      
    } catch (error: any) {
      console.error('❌ PDF 上传失败:', error);
      alert(`上传失败: ${error.message}`);
    } finally {
      setIsUploadingPdf(false);
    }
  };

  const handlePdfSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.pdf')) {
        alert('只支持 PDF 文件');
        return;
      }
      console.log('📄 选择了 PDF 文件:', file.name);
      handlePdfUpload(file);
    }
    // 重置 input，允许上传同名文件
    event.target.value = '';
  };

  const handleTriggerPdfUpload = () => {
    pdfInputRef.current?.click();
  };

  const uploadFile = async (file: File, prompt?: string) => {
    setIsUploading(true);
    setUploadProgress("正在上传视频...");
    const formData = new FormData();
    formData.append('file', file);
    formData.append('client_id', clientId);
    formData.append('model', selectedModel);
    if (prompt) {
        formData.append('prompt', prompt);
    }

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Upload initiated:', data);
      
      // The rest will be handled by WebSocket events

    } catch (error: any) {
      console.error('Error uploading file:', error);
      alert(`${t.uploadFail}: ${error.message || '请确保后端服务已启动。'}`);
      setIsUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('Selected file:', file.name);
      setSelectedFile(file);
    }
  };

  const handleTriggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      console.log('Dropped file:', file.name);
      setSelectedFile(file);
    }
  };

  const handleSendClick = async (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.stopPropagation();
    console.log("Send action triggered");
    
    if (!selectedFile && !currentMessage.trim()) {
       return;
    }

    if (!selectedFile && currentMessage.trim()) {
        handleSendMessage();
        return;
    }
    
    if (selectedFile && currentSessionId) {
        console.log("Starting upload for file:", selectedFile.name);
        
        // Add video placeholder
        const videoUrl = URL.createObjectURL(selectedFile);
        addMessage(currentSessionId, {
            role: 'user',
            type: 'video',
            content: videoUrl
        });

        // Add text prompt if exists
        if (currentMessage.trim()) {
            addMessage(currentSessionId, { 
                role: 'user', 
                type: 'text', 
                content: currentMessage 
            });
        }
        
        await uploadFile(selectedFile, currentMessage);
        setCurrentMessage("");
    }
  };

  return (
    <div 
      className={`h-screen w-full bg-[#f5f8ff] relative flex flex-col overflow-hidden font-sans selection:bg-purple-100 ${isDragging ? 'bg-purple-50 border-4 border-dashed border-healink-purple-start' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input 
        type="file" 
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="video/*"
        onChange={handleFileSelect}
      />
      <input 
        type="file" 
        ref={pdfInputRef}
        style={{ display: 'none' }}
        accept=".pdf"
        onChange={handlePdfSelect}
      />
      {/* Background Blobs - Replicating Figma Design (Group 1) */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden opacity-[0.58]">
         {/* ellipse4 */}
         <div className="absolute top-[483px] left-[530px] w-[386px] h-[386px] rounded-full bg-[#9e8af6] blur-[247px]"></div>
         {/* ellipse5 */}
         <div className="absolute top-[408px] left-[530px] w-[386px] h-[386px] rounded-full bg-[#9e8af6] blur-[111px]"></div>
         {/* ellipse3 */}
         <div className="absolute top-[362px] left-[438px] w-[386px] h-[386px] rounded-full bg-[#9e8af6] blur-[278px]"></div>
         {/* ellipse8 */}
         <div className="absolute top-[436px] left-[333px] w-[386px] h-[386px] rounded-full bg-[#9e8af6] blur-[278px]"></div>
         
         {/* ellipse2 container with nested ellipse6 */}
         <div className="absolute top-[436px] left-[693px] w-[386px] h-[386px] rounded-full bg-[#b9def6] blur-[220px] flex items-center justify-center">
            <div className="w-[386px] h-[386px] rounded-full bg-[#b9def6] blur-[106px] opacity-[0.14]"></div>
         </div>

         {/* ellipse7 */}
         <div className="absolute top-[483px] left-[861px] w-[386px] h-[386px] rounded-full bg-[#b9def6] blur-[119px]"></div>
         
         {/* ellipse9 */}
         <div className="absolute top-[215px] left-[1px] w-[386px] h-[386px] rounded-full bg-[#ffffff] blur-[119px] opacity-[0.74]"></div>
         {/* ellipse11 */}
         <div className="absolute top-0 left-[214px] w-[1048px] h-[309px] rounded-full bg-[#ffffff] blur-[119px] opacity-[0.74]"></div>
         {/* ellipse10 */}
         <div className="absolute top-[601px] left-[1px] w-[386px] h-[386px] rounded-full bg-[#ffffff] blur-[119px] opacity-[0.74]"></div>
      </div>

      {/* Header */}
      <header className="relative z-20 flex items-center justify-between px-12 py-6 w-full max-w-[1440px] mx-auto">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Healink Logo" className="w-9 h-9 object-contain" />
          <span className="text-2xl font-bold text-healink-navy">Healink</span>
          
          <button 
            onClick={toggleSidebar}
            className="ml-auto p-1 hover:bg-gray-100 rounded-full transition-colors mr-8"
          >
             <ChevronLeft className={`w-6 h-6 text-healink-navy transition-transform duration-300 ${isSidebarOpen ? '' : 'rotate-180'}`} />
          </button>
        </div>

        <nav className="flex items-center gap-8">
          <a href="#" className="text-sm text-healink-navy hover:text-healink-purple-start">{t.basicVersion}</a>
          <div className="h-4 w-[1px] bg-gray-300"></div>
          <button onClick={toggleLanguage} className="text-sm text-healink-navy hover:text-healink-purple-start flex items-center gap-1">{t.languageName}</button>
          <a href="#" className="text-sm text-healink-navy hover:text-healink-purple-start">{t.mobileVersion}</a>
          <a href="#" className="text-sm text-healink-navy hover:text-healink-purple-start">{t.contactUs}</a>
          
          <div className="flex items-center gap-6 ml-4">
            <button onClick={handleLogout} className="text-sm font-bold text-healink-navy hover:text-healink-purple-start transition-colors">
              {t.logout}
            </button>
            <div 
              className="flex items-center gap-2 bg-[#e9e9fd] rounded-full pl-4 pr-1 py-1 cursor-pointer hover:bg-[#dadafc] transition-colors"
              onClick={() => navigate('/settings')}
            >
              <span className="text-xs font-bold text-healink-navy">{userName}</span>
              <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-xs text-white font-bold">
                {userName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 w-full max-w-[1440px] mx-auto px-12 pb-12 grid grid-cols-12 gap-8 overflow-hidden">
        
        {/* Left Sidebar - History Feed */}
        <aside className={`col-span-3 py-6 flex flex-col overflow-hidden border-r border-gray-200 pr-4 ${isSidebarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10 w-0 col-span-0 hidden border-none'} transition-all duration-500 ease-in-out`}>
          <button 
            onClick={handleStartNewAssessment}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-healink-purple-start to-healink-purple-end text-white rounded-full py-4 px-6 shadow-md hover:shadow-lg transition-all mb-6 w-full max-w-[280px] hover:scale-105 flex-shrink-0"
          >
            <Plus className="w-5 h-5" />
            <span className="text-lg font-bold">新建对话</span>
          </button>

          <div className="flex-1 overflow-y-auto pr-2 space-y-3 scrollbar-thin min-h-0">
            <h3 className="text-xs text-gray-400 font-medium mb-2 pl-2 sticky top-0 bg-[#f5f8ff] py-2">聊天记录</h3>
            {sessions.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                暂无对话记录
              </div>
            ) : (
              sessions.map((session) => (
                <HistoryCard 
                  key={session.id} 
                  summary={session.title}
                  active={session.id === currentSessionId}
                  onClick={() => handleSessionClick(session.id)}
                  onDelete={(e) => handleDeleteSession(e, session.id)}
                />
              ))
            )}
          </div>
          
          {/* PDF Upload Button */}
          <div className="mt-4 pt-4 border-t border-gray-200 flex-shrink-0">
            <button
              onClick={handleTriggerPdfUpload}
              disabled={isUploadingPdf}
              className={`w-full flex items-center justify-center gap-2 bg-white border-2 border-healink-purple-start text-healink-purple-start rounded-full py-3 px-4 shadow-sm hover:shadow-md transition-all ${isUploadingPdf ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-50'}`}
            >
              <Upload className="w-4 h-4" />
              <span className="text-sm font-medium">
                {isUploadingPdf ? '上传中...' : '📚 上传 PDF 到知识库'}
              </span>
            </button>
          </div>
        </aside>

        {/* Center Content - Chat Area */}
        <section className={`flex flex-col overflow-hidden pb-4 pt-4 transition-all duration-500 ease-in-out ${isSidebarOpen ? 'col-span-9' : 'col-span-12'}`}>
          
          {/* Model Selector - Top Left */}
          <div className="w-full max-w-[900px] mx-auto mb-4 px-4 flex-shrink-0">
            <div ref={modelSelectorRef} className="relative inline-block">
              <button
                onClick={() => setIsModelSelectorOpen(!isModelSelectorOpen)}
                className="flex items-center gap-2 bg-white border-2 border-purple-100 rounded-xl px-4 py-2 shadow-sm hover:shadow-md transition-all hover:border-healink-purple-start group"
              >
                <span className="text-xl">{models.find(m => m.id === selectedModel)?.icon}</span>
                <div className="flex flex-col items-start">
                  <span className="text-[10px] text-gray-500 font-medium">当前模型</span>
                  <span className="text-xs font-bold text-healink-navy">{models.find(m => m.id === selectedModel)?.name}</span>
                </div>
                <svg 
                  className={`w-4 h-4 text-healink-navy transition-transform ${isModelSelectorOpen ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {isModelSelectorOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-1.5">
                    {models.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => {
                          setSelectedModel(model.id);
                          setIsModelSelectorOpen(false);
                        }}
                        className={`w-full flex items-start gap-3 p-3 rounded-lg transition-all hover:bg-purple-50 ${
                          selectedModel === model.id ? 'bg-purple-50 border-2 border-healink-purple-start' : 'border-2 border-transparent'
                        }`}
                      >
                        <span className="text-2xl flex-shrink-0">{model.icon}</span>
                        <div className="flex-1 text-left">
                          <div className="font-bold text-healink-navy text-sm mb-0.5">{model.name}</div>
                          <div className="text-[11px] text-gray-500">{model.description}</div>
                        </div>
                        {selectedModel === model.id && (
                          <div className="flex-shrink-0">
                            <svg className="w-5 h-5 text-healink-purple-start" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Chat Area - Scrollable Container */}
          <div 
            ref={chatContainerRef}
            className="flex-1 w-full max-w-[900px] mx-auto overflow-y-auto px-4 scroll-smooth scrollbar-thin"
          >
            {chatHistory.length === 0 ? (
              <div className="text-center mb-16 mt-20">
                <div 
                  className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-md mx-auto mb-6 text-healink-purple-start cursor-pointer hover:shadow-lg hover:scale-105 transition-all"
                  onClick={handleTriggerUpload}
                >
                   <Upload className="w-8 h-8" />
                </div>
                <h1 className="text-4xl font-bold text-healink-navy mb-4">
                  {t.uploadTitle}
                </h1>
                <p 
                  className="text-healink-navy/60 cursor-pointer hover:text-healink-purple-start transition-colors"
                  onClick={handleTriggerUpload}
                >
                  {t.uploadSubtitle}
                </p>
              </div>
            ) : (
              <div className="space-y-6 py-4">
                {chatHistory.map((msg, idx) => (
                  <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {/* AI 头像 - 只在左侧显示 */}
                    {msg.role === 'model' && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-healink-purple-start to-healink-purple-end flex items-center justify-center text-white text-sm font-bold shadow-md">
                        G
                      </div>
                    )}
                    
                    <div className={`max-w-[80%] p-4 rounded-2xl ${
                      msg.role === 'user' 
                        ? 'bg-[#7d51de] text-white rounded-br-none' 
                        : 'bg-white text-healink-navy shadow-sm rounded-bl-none'
                    }`}>
                      {msg.type === 'video' ? (
                        <div className="flex flex-col gap-2">
                            {msg.role === 'model' && <p className="font-bold mb-2">视频生成完成！</p>}
                            <div className="rounded-lg overflow-hidden bg-black/10 aspect-video">
                                <video 
                                    src={msg.content} 
                                    controls 
                                    className="w-full h-full object-contain" 
                                />
                            </div>
                            {msg.role === 'model' && (
                                <a 
                                    href={msg.content} 
                                    download="generated_video.mp4"
                                    className="text-sm text-healink-purple-start hover:underline mt-1"
                                >
                                    下载视频
                                </a>
                            )}
                        </div>
                      ) : msg.role === 'user' ? (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2" {...props} />,
                            ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-2" {...props} />,
                            li: ({node, ...props}) => <li className="mb-1" {...props} />,
                            a: ({node, ...props}) => <a className="text-blue-500 hover:underline" {...props} />,
                            strong: ({node, ...props}) => <strong className="font-bold" {...props} />,
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      )}
                    </div>
                    
                    {/* 用户头像 - 只在右侧显示 */}
                    {msg.role === 'user' && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold shadow-md">
                        {userName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                ))}
                
                {/* 流式输出中的消息 */}
                {isChatting && streamingMessage && streamingMessage.length > 0 && (
                  <div className="flex gap-3 justify-start" key="streaming">
                    {/* AI 头像 */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-healink-purple-start to-healink-purple-end flex items-center justify-center text-white text-sm font-bold shadow-md">
                      G
                    </div>
                    <div className="bg-white text-healink-navy shadow-sm rounded-2xl rounded-bl-none p-4 max-w-[80%]">
                      <div className="whitespace-pre-wrap">{streamingMessage}</div>
                      <span className="inline-block w-2 h-4 bg-healink-purple-start animate-pulse ml-1">|</span>
                    </div>
                  </div>
                )}
                
                {/* AI 思考中的动画 */}
                {isChatting && !streamingMessage && (
                  <div className="flex gap-3 justify-start" key="thinking">
                    {/* AI 头像 */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-healink-purple-start to-healink-purple-end flex items-center justify-center text-white text-sm font-bold shadow-md">
                      AI
                    </div>
                    <div className="bg-white text-healink-navy shadow-sm rounded-2xl rounded-bl-none p-4">
                      <div className="flex space-x-2 items-center h-6">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          {/* Input Area - Fixed at bottom */}
          <div 
            className={`bg-white rounded-[30px] p-4 w-full max-w-[900px] mx-auto shadow-lg flex flex-col gap-4 relative transition-shadow z-30 flex-shrink-0 ${isUploading ? 'opacity-90' : ''}`}
          >
            {/* 状态信息栏 */}
            {statusInfo && (
              <div className="absolute -top-12 left-0 w-full text-center z-40">
                <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-2 rounded-full font-medium shadow-md animate-pulse">
                  {statusInfo}
                </span>
              </div>
            )}
            
            {isUploading && (
              <div className="absolute -top-12 left-0 w-full text-center z-40">
                <span className="bg-white/90 backdrop-blur px-6 py-2 rounded-full text-healink-purple-start font-bold shadow-md border border-purple-100 animate-pulse">
                  {uploadProgress || "正在处理..."}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 w-full">
                <div 
                    className={`flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 cursor-pointer transition-colors ${selectedFile ? 'text-healink-purple-start bg-purple-50' : 'text-gray-400'}`}
                    onClick={handleTriggerUpload}
                    title={selectedFile ? selectedFile.name : "Upload Video"}
                >
                    <Upload className="w-5 h-5" />
                </div>
                
                <input
                    type="text"
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendClick(e);
                        }
                    }}
                    placeholder={selectedFile ? `已选择视频: ${selectedFile.name} - 点击发送开始生成` : "输入消息与康复教练对话..."}
                    className="flex-1 bg-transparent border-none outline-none text-healink-navy placeholder-gray-400 px-2"
                    disabled={isUploading}
                />

                <button 
                type="button"
                onClick={handleSendClick}
                disabled={(!currentMessage.trim() && !selectedFile) || isUploading}
                className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-colors ${
                    (currentMessage.trim() || selectedFile) && !isUploading
                    ? 'bg-[#7d51de] text-white hover:bg-[#6b44c0]' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                >
                <ArrowUp className="w-5 h-5" />
                </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
