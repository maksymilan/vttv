import React from 'react';
import { useLanguageStore } from '../store/useLanguageStore';
import { translations } from '../lib/translations';

export interface HeaderProps {
  viewMode: 'login' | 'register';
  onViewChange: (mode: 'login' | 'register') => void;
}

export const Header: React.FC<HeaderProps> = ({ viewMode, onViewChange }) => {
  const { language, toggleLanguage } = useLanguageStore();
  const t = translations[language];

  return (
    <header className="flex items-center justify-between px-12 py-6 w-full max-w-[1440px] mx-auto">
      <div className="flex items-center gap-3">
        {/* Logo Icon */}
        <img src="/logo.png" alt="Healink Logo" className="w-9 h-9 object-contain" />
        <span className="text-2xl font-bold text-healink-navy">Healink</span>
      </div>

      <nav className="flex items-center gap-8">
        <a href="#" className="text-sm text-healink-navy hover:text-healink-purple-start">{t.basicVersion}</a>
        <div className="h-4 w-[1px] bg-gray-300"></div>
        <button 
          onClick={toggleLanguage}
          className="text-sm text-healink-navy hover:text-healink-purple-start flex items-center gap-1"
        >
          {t.languageName}
        </button>
        <a href="#" className="text-sm text-healink-navy hover:text-healink-purple-start">{t.mobileVersion}</a>
        <a href="#" className="text-sm text-healink-navy hover:text-healink-purple-start">{t.contactUs}</a>
        
        <div className="flex items-center gap-4 ml-4">
          <button 
            onClick={() => onViewChange('register')}
            className={`px-6 py-1.5 rounded-full text-sm font-bold transition-all ${
              viewMode === 'register' 
                ? 'bg-gradient-to-r from-healink-purple-start to-healink-purple-end text-white shadow-md hover:shadow-lg' 
                : 'border border-healink-purple-start text-healink-purple-start hover:bg-purple-50'
            }`}
          >
            {t.register}
          </button>
          <button 
            onClick={() => onViewChange('login')}
            className={`px-6 py-1.5 rounded-full text-sm font-bold transition-all ${
              viewMode === 'login'
                ? 'bg-gradient-to-r from-healink-purple-start to-healink-purple-end text-white shadow-md hover:shadow-lg'
                : 'border border-healink-purple-start text-healink-purple-start hover:bg-purple-50'
            }`}
          >
            {t.login}
          </button>
        </div>
      </nav>
    </header>
  );
};
