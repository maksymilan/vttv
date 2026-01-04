import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage.js';
import { HomePage } from './pages/HomePage.js';
import { ResultPage } from './pages/ResultPage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import FigmaComponent from '../.figma/1745_6527/index.js';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/preview" element={<FigmaComponent />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
