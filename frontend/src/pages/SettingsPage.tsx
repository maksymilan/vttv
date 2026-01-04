import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import { useLanguageStore } from '../store/useLanguageStore';
import { translations } from '../lib/translations';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguageStore();
  const t = translations[language];

  return (
    <div className="min-h-screen w-full bg-white relative overflow-hidden font-sans selection:bg-purple-100 flex flex-col">
      {/* Background Blobs - Replicating Figma Design (Group 3012) */}
       <div className="absolute top-[-291px] left-[-637px] w-[2255px] h-[1492px] pointer-events-none z-0">
          {/* Group 1 (same as Home/Login) */}
          <div className="absolute top-0 left-0 w-[1262px] h-[988px]">
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
 
             {/* ellipse9 */}
             <div className="absolute top-[215px] left-[1px] w-[386px] h-[386px] rounded-full bg-[#ffffff] blur-[119px] opacity-[0.74]"></div>
             {/* ellipse11 */}
             <div className="absolute top-0 left-[214px] w-[1048px] h-[309px] rounded-full bg-[#ffffff] blur-[119px] opacity-[0.74]"></div>
             {/* ellipse10 */}
             <div className="absolute top-[601px] left-[1px] w-[386px] h-[386px] rounded-full bg-[#ffffff] blur-[119px] opacity-[0.74]"></div>
          </div>
 
          {/* Group 2 (User Interface specific) */}
          <div className="absolute top-[559px] left-[1198px] w-[1057px] h-[933px] -rotate-[70deg]">
             {/* ellipse42 */}
             <div className="absolute top-[252px] left-[302px] w-[324px] h-[365px] rounded-full bg-[#9e8af6] blur-[247px]"></div>
             {/* ellipse52 */}
             <div className="absolute top-[252px] left-[302px] w-[324px] h-[365px] rounded-full bg-[#9e8af6] blur-[111px]"></div>
             {/* ellipse32 */}
             <div className="absolute top-[252px] left-[302px] w-[324px] h-[365px] rounded-full bg-[#9e8af6] blur-[278px]"></div>
             {/* ellipse32 duplicate */}
             <div className="absolute top-[252px] left-[302px] w-[324px] h-[365px] rounded-full bg-[#9e8af6] blur-[278px]"></div>
             
             {/* ellipse22 */}
             <div className="absolute top-[252px] left-[302px] w-[324px] h-[365px] rounded-full bg-[#b9def6] blur-[220px]"></div>
             
             {/* ellipse62 */}
             <div className="absolute top-[252px] left-[302px] w-[324px] h-[365px] rounded-full bg-[#b9def6] blur-[106px] opacity-[0.14]"></div>
             
             {/* ellipse92 */}
             <div className="absolute top-[252px] left-[302px] w-[324px] h-[365px] rounded-full bg-[#ffffff] blur-[119px] opacity-[0.74]"></div>
             
             {/* ellipse112 */}
             <div className="absolute top-[4px] left-[242px] w-[878px] h-[292px] rounded-full bg-[#ffffff] blur-[119px] opacity-[0.74]"></div>

             {/* ellipse92 duplicate */}
             <div className="absolute top-[252px] left-[302px] w-[324px] h-[365px] rounded-full bg-[#ffffff] blur-[119px] opacity-[0.74]"></div>
          </div>
       </div>

      <header className="relative z-20 flex items-center justify-between px-12 py-6 w-full max-w-[1440px] mx-auto">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/home')}>
           <img src="/logo.png" alt="Healink Logo" className="w-9 h-9 object-contain" />
          <span className="text-2xl font-bold text-healink-navy">Healink</span>
        </div>
        
        <div className="flex items-center gap-6">
           <button onClick={() => navigate('/')} className="text-sm font-bold text-healink-navy hover:text-healink-purple-start transition-colors">{t.logout}</button>
           <div className="h-4 w-[1px] bg-gray-300"></div>
           <button onClick={() => navigate('/home')} className="text-sm font-bold text-healink-navy hover:text-healink-purple-start transition-colors">{t.back}</button>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center w-full max-w-[1440px] mx-auto pb-20">
         <div className="flex flex-col items-center mb-10">
            <div className="w-[130px] h-[130px] bg-[#7f51de] rounded-full flex items-center justify-center text-[64px] text-white font-medium mb-6 shadow-lg">
              {t.userAvatar}
            </div>
            <h1 className="text-[48px] font-bold text-black">{t.userPrefix}4251</h1>
         </div>

         <div className="w-full max-w-[531px] space-y-12">
            <div className="bg-white rounded-[24px] shadow-lg p-0 overflow-hidden">
                <div className="px-[210px] py-8 border-b border-purple-100 hover:bg-purple-50 transition-colors cursor-pointer text-center">
                   <span className="text-2xl font-medium text-healink-navy">{t.accountInfo}</span>
                </div>
                <div className="px-[210px] py-8 border-b border-purple-100 hover:bg-purple-50 transition-colors cursor-pointer text-center">
                   <span className="text-2xl font-medium text-healink-navy">{t.preferences}</span>
                </div>
                <div className="px-[210px] py-8 hover:bg-purple-50 transition-colors cursor-pointer text-center">
                   <span className="text-2xl font-medium text-healink-navy">{t.helpAbout}</span>
                </div>
            </div>

            <div className="bg-white rounded-[24px] shadow-lg p-0 overflow-hidden">
                <div className="px-[210px] py-8 border-b border-purple-100 hover:bg-purple-50 transition-colors cursor-pointer text-center">
                   <span className="text-2xl font-medium text-healink-navy">{t.myFavorites}</span>
                </div>
                 <div className="px-[210px] py-8 hover:bg-purple-50 transition-colors cursor-pointer text-center">
                   <span className="text-2xl font-medium text-healink-navy">{t.historyRecords}</span>
                </div>
            </div>
         </div>
      </main>
    </div>
  );
};
