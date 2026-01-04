import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, Mail, Lock } from 'lucide-react';
import { useLanguageStore } from '../store/useLanguageStore';
import { translations } from '../lib/translations';

export interface LoginFormProps {
  viewMode: 'login' | 'register';
  onViewChange: (mode: 'login' | 'register') => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ viewMode, onViewChange }) => {
  const navigate = useNavigate();
  const { language } = useLanguageStore();
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<'code' | 'password'>('code');
  
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    if (viewMode === 'register') return;

    // Condition 1: Phone + Password
    if (activeTab === 'password' && phone === '17964644251' && password === 'jjjjm') {
      navigate('/home');
      return;
    }

    // Condition 2: Phone + Code
    if (activeTab === 'code' && phone === '17964644251' && code === '000000') {
      navigate('/home');
      return;
    }

    alert(t.loginFailed);
  };

  const renderLoginTabs = () => (
    <div className="flex items-center gap-8 mb-6 border-b border-gray-100 pb-2">
      <button
        onClick={() => setActiveTab('code')}
        className={`text-lg font-bold pb-2 transition-colors relative ${
          activeTab === 'code' ? 'text-healink-navy' : 'text-gray-400'
        }`}
      >
        {t.codeLogin}
        {activeTab === 'code' && (
          <div className="absolute bottom-[-9px] left-0 w-full h-[3px] bg-healink-purple-end rounded-full"></div>
        )}
      </button>
      <button
        onClick={() => setActiveTab('password')}
        className={`text-lg font-bold pb-2 transition-colors relative ${
          activeTab === 'password' ? 'text-healink-navy' : 'text-gray-400'
        }`}
      >
        {t.passwordLogin}
        {activeTab === 'password' && (
          <div className="absolute bottom-[-9px] left-0 w-full h-[3px] bg-healink-purple-end rounded-full"></div>
        )}
      </button>
    </div>
  );

  const renderRegisterTitle = () => (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-healink-navy text-center">{t.createAccount}</h2>
    </div>
  );

  return (
    <div className="relative z-10">
      <div className="bg-white rounded-[24px] shadow-[0_30px_42px_0_rgba(142,130,193,0.48)] pt-[42px] pr-[68px] pb-[53px] pl-[60px] w-[639px] h-[449px] relative overflow-hidden flex flex-col">
        {viewMode === 'login' ? renderLoginTabs() : renderRegisterTitle()}

        {/* Agreement */}
        <p className="text-sm text-black mb-6 mt-1 flex items-center flex-wrap gap-1">
          <span className="text-[#aeb2b7]">{t.agreementPrefix}</span>
          <a href="#" className="text-healink-navy underline decoration-1 underline-offset-2">{t.userAgreement}</a>
          <span className="text-[#aeb2b7]">{t.and}</span>
          <a href="#" className="text-healink-navy underline decoration-1 underline-offset-2">{t.privacyPolicy}</a>
        </p>

        {/* Inputs */}
        <div className="space-y-6 flex-1">
          <div className="relative group h-[54px]">
            <div className="absolute inset-y-0 left-0 pl-[22px] flex items-center pointer-events-none">
              <Smartphone className="h-[19px] w-[13px] text-[#232c62]" />
            </div>
            <div className="absolute inset-y-0 left-[47px] flex items-center pointer-events-none">
               <span className="text-black font-medium text-sm">+86</span>
            </div>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="block w-full pl-[82px] pr-4 h-full border-2 border-[#232c62]/46 rounded-[9px] text-sm focus:ring-0 focus:border-healink-purple-start outline-none transition-all placeholder-[#aeb2b7]"
              placeholder={t.phonePlaceholder}
            />
          </div>

          {viewMode === 'login' && activeTab === 'code' && (
            <div className="flex justify-between items-center h-[54px]">
              <div className="relative w-[381px] h-full group">
                <div className="absolute inset-y-0 left-0 pl-[21px] flex items-center pointer-events-none">
                  <Mail className="h-[14px] w-[18px] text-[#232c62]" />
                </div>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="block w-full pl-[51px] pr-4 h-full border-2 border-[#232c62]/46 rounded-[9px] text-sm focus:ring-0 focus:border-healink-purple-start outline-none transition-all placeholder-[#aeb2b7]"
                  placeholder={t.codePlaceholder}
                />
              </div>
              <button className="w-[111px] h-full border-2 border-[#7e51df]/46 text-[#7d51de] text-sm font-bold rounded-[9px] hover:bg-purple-50 transition-colors whitespace-nowrap flex items-center justify-center">
                {t.sendCode}
              </button>
            </div>
          )}

          {viewMode === 'login' && activeTab === 'password' && (
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-12 pr-20 py-3 border-2 border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-healink-purple-start focus:border-transparent outline-none transition-all group-hover:border-gray-200"
                placeholder={t.passwordPlaceholder}
              />
              <div className="absolute inset-y-0 right-4 flex items-center">
                <a href="#" className="text-xs text-gray-400 hover:text-healink-purple-start">{t.forgotPassword}</a>
              </div>
            </div>
          )}

          {viewMode === 'register' && (
            <>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  className="block w-full pl-12 pr-4 py-3 border-2 border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-healink-purple-start focus:border-transparent outline-none transition-all group-hover:border-gray-200"
                  placeholder={t.passwordPlaceholder}
                />
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  className="block w-full pl-12 pr-4 py-3 border-2 border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-healink-purple-start focus:border-transparent outline-none transition-all group-hover:border-gray-200"
                  placeholder={t.confirmPasswordPlaceholder}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer Links (Only for Login mode as per design) */}
        {viewMode === 'login' && (
          <div className="mt-[17px] flex justify-center">
              <span className="text-sm text-[#aeb2b7]">
                  {t.noAccount} <button onClick={() => onViewChange('register')} className="text-healink-purple-start font-medium hover:underline">{t.goToRegister}</button>
              </span>
          </div>
        )}

        {/* Action Button */}
        <button 
          onClick={handleLogin}
          className="w-full mt-[19px] bg-gradient-to-r from-[#7d51de] to-[#9153df] text-white h-[55px] rounded-[16px] font-bold text-xl shadow-lg hover:shadow-xl hover:opacity-90 transition-all tracking-[6.8px] flex items-center justify-center"
        >
          {viewMode === 'login' ? t.loginButton : t.registerButton}
        </button>
      </div>
    </div>
  );
};
