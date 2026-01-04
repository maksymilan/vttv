import { create } from 'zustand';

interface LanguageState {
  language: 'zh' | 'en';
  toggleLanguage: () => void;
  setLanguage: (lang: 'zh' | 'en') => void;
}

export const useLanguageStore = create<LanguageState>((set) => ({
  language: 'zh',
  toggleLanguage: () => set((state) => ({ language: state.language === 'zh' ? 'en' : 'zh' })),
  setLanguage: (lang) => set({ language: lang }),
}));
