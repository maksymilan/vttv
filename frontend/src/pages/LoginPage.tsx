import React from 'react';
import { Header } from '../components/Header';
import { HeroSection } from '../components/HeroSection';
import { LoginForm } from '../components/LoginForm';
import { useLanguageStore } from '../store/useLanguageStore';
import { translations } from '../lib/translations';

const TextCarousel: React.FC = () => {
  const { language } = useLanguageStore();
  const t = translations[language];
  const [index, setIndex] = React.useState(0);
  const [isTransitioning, setIsTransitioning] = React.useState(true);
  
  const originalTexts = [
    t.carousel1,
    t.carousel2,
    t.carousel3,
    t.carousel4,
    t.carousel5
  ];
  
  // Add first element to end for seamless loop
  const texts = React.useMemo(() => [...originalTexts, originalTexts[0]], [originalTexts]);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => prev + 1);
      setIsTransitioning(true);
    }, 3000); 
    return () => clearInterval(timer);
  }, []);

  // Handle the reset from last item (duplicate of first) to actual first item
  React.useEffect(() => {
    if (index === texts.length - 1) {
      const timeout = setTimeout(() => {
        setIsTransitioning(false); // Disable transition for instant jump
        setIndex(0);
      }, 700); // Wait for transition to finish
      return () => clearTimeout(timeout);
    }
  }, [index, texts.length]);

  return (
    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 h-[30px] overflow-hidden w-full max-w-[800px]">
      <div 
        className={`flex flex-col items-center ${isTransitioning ? 'transition-transform duration-700 ease-in-out' : ''}`}
        style={{ transform: `translateY(-${index * 30}px)` }}
      >
        {texts.map((text, i) => (
          <div key={i} className="h-[30px] w-full flex items-center justify-center text-center text-sm text-[#232c62] opacity-60">
            {text}
          </div>
        ))}
      </div>
    </div>
  );
};

export const LoginPage: React.FC = () => {
  const [viewMode, setViewMode] = React.useState<'login' | 'register'>('login');

  return (
    <div className="min-h-screen w-full bg-[#f5f8ff] relative overflow-hidden font-sans selection:bg-purple-100">
      {/* Background Blobs - Replicating Figma Design */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden">
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

      <div className="relative z-10 flex flex-col h-screen max-w-[1440px] mx-auto">
        <Header viewMode={viewMode} onViewChange={setViewMode} />
        
        <main className="flex-1 px-24 pb-12 grid grid-cols-12 gap-8 items-center relative">
          <div className="col-span-6 h-full flex items-center">
            <HeroSection />
          </div>
          
          <div className="col-span-6 h-full flex items-center justify-center relative">
             <LoginForm viewMode={viewMode} onViewChange={setViewMode} />
          </div>

          <TextCarousel />
        </main>
      </div>
    </div>
  );
};
