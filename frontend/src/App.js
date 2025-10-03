import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProjectList from './components/ProjectList';
import CreateProject from './components/CreateProject';
import Register from './components/Register';
import Login from './components/Login';
import ProjectApplications from './components/ProjectApplications';
import MyApplications from './components/MyApplications';
import './App.css';
import Profile from './components/Profile';
import EditProject from './components/EditProject';
import Chat from './components/Chat';

function App() {
  const [user, setUser] = useState(null);
  const [appLoading, setAppLoading] = useState(true);

  useEffect(() => {
    // Проверяем, есть ли сохраненный пользователь и токен
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Ошибка при парсинге пользователя:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
    setAppLoading(false);
     // Предотвращаем случайное закрытие/перезагрузку страницы
  const handleBeforeUnload = (e) => {
    // Если есть несохраненные данные, показываем предупреждение
    const unsavedChanges = localStorage.getItem('unsavedChanges');
    if (unsavedChanges) {
      e.preventDefault();
      e.returnValue = 'У вас есть несохраненные изменения. Вы уверены, что хотите уйти?';
      return e.returnValue;
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  
  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (appLoading) {
    return <div className="app-loading">Загрузка приложения...</div>;
  }

  return (
    <Router>
      <div className="App">
        <Navbar user={user} onLogout={handleLogout} />
        <main>
          <Routes>
            <Route path="/" element={<ProjectList user={user} />} />
            <Route path="/create-project" element={<CreateProject user={user} />} />
            <Route path="/register" element={<Register onLogin={handleLogin} />} />
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route path="/project-applications/:projectId" element={<ProjectApplications user={user} />} />
            <Route path="/my-applications" element={<MyApplications user={user} />} />
            <Route path="/profile" element={<Profile user={user} />} />
            <Route path="/edit-project/:id" element={<EditProject user={user} />} />
            <Route path="/chat" element={<Chat user={user} />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;