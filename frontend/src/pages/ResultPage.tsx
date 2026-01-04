import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Upload, ArrowUp, ChevronLeft, Play } from 'lucide-react';
import { useLanguageStore } from '../store/useLanguageStore';
import { translations } from '../lib/translations';

interface HistoryItemProps {
  summary: string;
  onClick?: () => void;
}

const HistoryCard: React.FC<HistoryItemProps> = ({ summary, onClick }) => (
  <div 
    onClick={onClick}
    className="bg-white/50 rounded-2xl p-4 hover:bg-white transition-colors cursor-pointer border border-transparent hover:border-purple-100 hover:shadow-sm"
  >
    <p className="font-bold text-healink-navy">{summary}</p>
  </div>
);

export const ResultPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, toggleLanguage } = useLanguageStore();
  const t = translations[language];
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // State for new uploads from this page
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Get data from navigation state
  const { inputVideoUrl, outputVideoUrl, inputFileName } = location.state || {};

  useEffect(() => {
    if (!inputVideoUrl || !outputVideoUrl) {
      // If accessed directly without data, maybe redirect back home or show empty state
      // navigate('/home'); 
    }
  }, [inputVideoUrl, outputVideoUrl, navigate]);

  const handleHistoryClick = (summary: string) => {
    console.log(`Clicked history item: ${summary}`);
    navigate('/preview'); 
  };

  // Mock data - same as HomePage
  const historyData = {
    today: [
      { summary: t.history1 }
    ],
    last7Days: [
      { summary: t.history2 },
      { summary: t.history3 }
    ],
    last30Days: [
      { summary: t.history4 },
      { summary: t.history2 }
    ]
  };

  const handleLogout = () => navigate('/');
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // --- Upload Logic (Reused from HomePage for the bottom bar) ---
  const uploadFile = async (file: File) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error(`Upload failed: ${response.statusText}`);

      const data = await response.json();
      console.log('Upload success:', data);
      
      if (data.status === 'success' && data.download_url) {
        // Navigate to self (refresh) or update state to show new result
        // For now, let's update the current view with the new video
        navigate('/result', { 
            state: { 
                inputVideoUrl: URL.createObjectURL(file), 
                outputVideoUrl: data.download_url,
                inputFileName: file.name
            },
            replace: true 
        });
        setSelectedFile(null);
      } else {
         alert('视频上传成功，但处理结果未知。');
      }

    } catch (error) {
      console.error('Error uploading file:', error);
      alert('上传失败，请确保后端服务已启动。');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleTriggerUpload = () => fileInputRef.current?.click();

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
    if (file) setSelectedFile(file);
  };

  const handleSendClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedFile) {
       handleTriggerUpload();
       return;
    }
    await uploadFile(selectedFile);
  };

  return (
    <div 
      className={`min-h-screen w-full bg-[#f5f8ff] relative overflow-hidden font-sans selection:bg-purple-100 flex flex-col ${isDragging ? 'bg-purple-50 border-4 border-dashed border-healink-purple-start' : ''}`}
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
      {/* Background Blobs */}
      <div className="absolute top-0 right-0 w-[1440px] h-full pointer-events-none z-0">
         <div className="absolute top-[20%] left-[30%] w-[500px] h-[500px] bg-[#9e8af6] rounded-full blur-[150px] opacity-30"></div>
         <div className="absolute top-[40%] left-[50%] w-[500px] h-[500px] bg-[#b9def6] rounded-full blur-[120px] opacity-40"></div>
      </div>

      {/* Header */}
      <header className="relative z-20 flex items-center justify-between px-12 py-6 w-full max-w-[1440px] mx-auto">
        <div className="flex items-center gap-3 w-[25%]">
          <img src="/logo.png" alt="Healink Logo" className="w-9 h-9 object-contain" />
          <span className="text-2xl font-bold text-healink-navy">Healink</span>
          <button onClick={toggleSidebar} className="ml-auto p-1 hover:bg-gray-100 rounded-full transition-colors mr-8">
             <ChevronLeft className={`w-6 h-6 text-healink-navy transition-transform duration-300 ${isSidebarOpen ? '' : 'rotate-180'}`} />
          </button>
        </div>

        <nav className="flex items-center gap-8 flex-1 justify-end">
          <div className="flex items-center gap-8 text-sm text-healink-navy">
            <a href="#" className="hover:text-healink-purple-start">{t.basicVersion}</a>
            <div className="h-4 w-[1px] bg-gray-300"></div>
            <button onClick={toggleLanguage} className="hover:text-healink-purple-start">{t.languageName}</button>
            <a href="#" className="hover:text-healink-purple-start">{t.mobileVersion}</a>
            <a href="#" className="hover:text-healink-purple-start">{t.contactUs}</a>
          </div>
          
          <div className="flex items-center gap-6 ml-4">
            <button onClick={handleLogout} className="text-sm font-bold text-healink-navy hover:text-healink-purple-start transition-colors">{t.logout}</button>
            <div className="flex items-center gap-2 bg-[#e9e9fd] rounded-full pl-4 pr-1 py-1 cursor-pointer hover:bg-[#dadafc] transition-colors" onClick={() => navigate('/settings')}>
              <span className="text-xs font-bold text-healink-navy">{t.userPrefix}4251</span>
              <div className="w-6 h-6 bg-[#7f51de] rounded-full flex items-center justify-center text-[10px] text-white">{t.userAvatar}</div>
            </div>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 w-full max-w-[1440px] mx-auto px-12 pb-12 grid grid-cols-12 gap-8">
        
        {/* Left Sidebar */}
        <aside className={`col-span-3 py-6 flex flex-col h-full transition-all duration-500 ease-in-out overflow-hidden border-r border-gray-200 pr-4 ${isSidebarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10 w-0 col-span-0 hidden border-none'}`}>
          <button className="flex items-center justify-center gap-2 bg-white rounded-full py-4 px-6 shadow-sm hover:shadow-md transition-shadow mb-10 w-full max-w-[280px]" onClick={() => navigate('/home')}>
            <Plus className="w-5 h-5 text-healink-navy" />
            <span className="text-lg font-bold text-healink-navy">{t.startNewAssessment}</span>
          </button>

          <div className="flex-1 overflow-y-auto pr-4 space-y-8">
            <div>
              <h3 className="text-sm text-gray-400 font-medium mb-4 pl-2">{t.today}</h3>
              <div className="space-y-4">
                {historyData.today.map((item, index) => <HistoryCard key={index} summary={item.summary} />)}
              </div>
            </div>
            <div>
              <h3 className="text-sm text-gray-400 font-medium mb-4 pl-2">{t.last7Days}</h3>
              <div className="space-y-4">
                {historyData.last7Days.map((item, index) => <HistoryCard key={index} summary={item.summary} />)}
              </div>
            </div>
            <div>
              <h3 className="text-sm text-gray-400 font-medium mb-4 pl-2">{t.last30Days}</h3>
              <div className="space-y-4">
                {historyData.last30Days.map((item, index) => <HistoryCard key={index} summary={item.summary} />)}
              </div>
            </div>
          </div>
        </aside>

        {/* Center Content - Result Feed */}
        <section className={`flex flex-col h-full pb-6 transition-all duration-500 ease-in-out ${isSidebarOpen ? 'col-span-9' : 'col-span-12'}`}>
            {/* Header for the chat/result session */}
            <div className="flex items-center justify-center mb-8">
                <h1 className="text-lg font-bold text-healink-navy flex items-center gap-2">
                    {t.history1}
                    <span className="text-gray-400 cursor-pointer hover:text-red-500">♡</span>
                </h1>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto px-4 space-y-8 mb-8 custom-scrollbar">
                
                {/* User Input Bubble (Right) */}
                {inputVideoUrl && (
                    <div className="flex justify-end">
                        <div className="bg-[#7d51de] rounded-[20px] rounded-tr-sm p-4 text-white max-w-[60%] shadow-md">
                            <p className="mb-2 text-sm opacity-90">{t.uploadedVideo}{inputFileName}</p>
                            <div className="rounded-lg overflow-hidden bg-black/20">
                                <video src={inputVideoUrl} controls className="max-h-[200px] w-full object-contain" />
                            </div>
                        </div>
                    </div>
                )}

                {/* System Output Bubble/Area (Left/Center) */}
                {outputVideoUrl && (
                    <div className="flex flex-col gap-4">
                         {/* Optional text bubble */}
                        <div className="bg-white rounded-[20px] rounded-tl-sm p-6 shadow-sm max-w-[80%] self-start">
                             <p className="text-healink-navy font-medium">{t.assessmentCompleted}</p>
                        </div>

                        {/* Large Video Player */}
                        <div className="bg-gray-200 rounded-[30px] w-full aspect-video flex items-center justify-center overflow-hidden shadow-lg relative group">
                            <video 
                                src={outputVideoUrl} 
                                controls 
                                className="w-full h-full object-cover" 
                                autoPlay 
                            />
                        </div>
                    </div>
                )}
            </div>



        </section>
      </main>
    </div>
  );
};
