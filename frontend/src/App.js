import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

function RequireAuth({ user, children }) {
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RequireRole({ user, roles = [], children }) {
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function App() {
  const [user, setUser] = useState(null);
  const [appLoading, setAppLoading] = useState(true);

  useEffect(() => {
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

    const handleBeforeUnload = (e) => {
      const unsavedChanges = localStorage.getItem('unsavedChanges');
      if (unsavedChanges) {
        e.preventDefault();
        e.returnValue = 'У вас есть несохраненные изменения. Вы уверены, что хотите уйти?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
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

  const handleUserUpdate = (updatedUser) => {
  setUser(updatedUser);
  localStorage.setItem('user', JSON.stringify(updatedUser));
};
<Route path="/profile" element={<Profile user={user} onUserUpdate={handleUserUpdate} />} />

  if (appLoading) return <div className="app-loading">Загрузка приложения...</div>;

  return (
    <Router>
      <div className="App">
        <Navbar user={user} onLogout={handleLogout} />
        <main>
          <Routes>
            {/* Общая страница */}
            <Route path="/" element={<ProjectList user={user} />} />

            {/* Auth */}
            <Route path="/register" element={<Register onLogin={handleLogin} />} />
            <Route path="/login" element={<Login onLogin={handleLogin} />} />

            {/* Organizer */}
            <Route
              path="/create-project"
              element={
                <RequireRole user={user} roles={['organizer']}>
                  <CreateProject user={user} />
                </RequireRole>
              }
            />

            <Route
              path="/project-applications/:projectId"
              element={
                <RequireRole user={user} roles={['organizer']}>
                  <ProjectApplications user={user} />
                </RequireRole>
              }
            />

            <Route
              path="/edit-project/:id"
              element={
                <RequireRole user={user} roles={['organizer']}>
                  <EditProject user={user} />
                </RequireRole>
              }
            />

            {/* Volunteer */}
            <Route
              path="/my-applications"
              element={
                <RequireRole user={user} roles={['volunteer']}>
                  <MyApplications user={user} />
                </RequireRole>
              }
            />

            {/* Общие (все авторизованные) */}
            <Route
              path="/profile"
              element={
                <RequireAuth user={user}>
                  <Profile user={user} />
                </RequireAuth>
              }
            />

            <Route
              path="/chat"
              element={
                <RequireAuth user={user}>
                  <Chat user={user} />
                </RequireAuth>
              }
            />

            {/* fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
