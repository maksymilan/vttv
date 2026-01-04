import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useLanguageStore } from '../store/useLanguageStore';
import { translations } from '../lib/translations';

export const HeroSection: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguageStore();
  const t = translations[language];

  return (
    <div className="flex flex-col items-start justify-center h-full max-w-[600px] pt-20">
      <h1 className="text-[64px] leading-[1.1] font-bold text-healink-navy mb-6 tracking-tight">
        {language === 'zh' ? (
          <>
            Links every <br />
            move to better <br />
            healing.
          </>
        ) : (
           t.heroTitle.split('\n').map((line, i) => <React.Fragment key={i}>{line}<br/></React.Fragment>)
        )}
      </h1>
      
      <p className="text-xl text-healink-navy mb-20 opacity-80">
        {t.heroSubtitle}
      </p>

      <div className="mt-auto mb-32">
          <p className="text-xs text-gray-400 mb-6">{t.guestNote}</p>
          
          <button 
            onClick={() => navigate('/home')}
            className="group flex items-center gap-2 text-xl font-bold text-healink-navy hover:text-healink-purple-start transition-colors"
          >
            {t.startAssessment}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
      </div>
    </div>
  );
};
