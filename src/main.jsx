import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import GameApp from './GameApp';
import TeacherDashboard from './components/TeacherDashboard';
import TeacherLogin from './components/TeacherLogin';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<GameApp />} />
        <Route path="/teacher" element={<TeacherDashboard />} />
        <Route path="/teacher/login" element={<TeacherLogin />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
