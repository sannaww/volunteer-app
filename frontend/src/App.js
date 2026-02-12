import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import api from "./api/client"; // ✅ используем твой единый клиент (с токеном)

import Navbar from "./components/Navbar";
import ProjectList from "./components/ProjectList";
import CreateProject from "./components/CreateProject";
import Register from "./components/Register";
import Login from "./components/Login";
import ProjectApplications from "./components/ProjectApplications";
import MyApplications from "./components/MyApplications";
import Profile from "./components/Profile";
import EditProject from "./components/EditProject";
import Chat from "./components/Chat";
import AdminPanel from "./components/AdminPanel";
import Favorites from "./components/Favorites";

import "./App.css";

function RequireAuth({ user, loading, children }) {
  if (loading) return <div className="app-loading">Загрузка приложения...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RequireRole({ user, loading, roles = [], children }) {
  if (loading) return <div className="app-loading">Загрузка приложения...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function App() {
  const [user, setUser] = useState(null);
  const [appLoading, setAppLoading] = useState(true);

  // ✅ Нормальная инициализация: если есть token — подтягиваем user с backend
  useEffect(() => {
    const init = async () => {
      try {
        const token = localStorage.getItem("token");

        // нет токена — не авторизованы
        if (!token) {
          setUser(null);
          return;
        }

        // 1) быстрый fallback из localStorage (чтобы UI не пустовал)
        const savedUser = localStorage.getItem("user");
        if (savedUser) {
          try {
            setUser(JSON.parse(savedUser));
          } catch {
            // игнор
          }
        }

        // 2) источник истины — backend (роль/имя/блокировка и т.д.)
        const res = await api.get("/api/auth/me");
        setUser(res.data);
        localStorage.setItem("user", JSON.stringify(res.data));
      } catch (error) {
        // токен битый/просрочен — чистим
        console.error("Ошибка инициализации пользователя:", error);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
      } finally {
        setAppLoading(false);
      }
    };

    init();

    const handleBeforeUnload = (e) => {
      const unsavedChanges = localStorage.getItem("unsavedChanges");
      if (unsavedChanges) {
        e.preventDefault();
        e.returnValue =
          "У вас есть несохраненные изменения. Вы уверены, что хотите уйти?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));
  };

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
                <RequireRole user={user} loading={appLoading} roles={["organizer"]}>
                  <CreateProject user={user} />
                </RequireRole>
              }
            />

            <Route
              path="/project-applications/:projectId"
              element={
                <RequireRole user={user} loading={appLoading} roles={["organizer"]}>
                  <ProjectApplications user={user} />
                </RequireRole>
              }
            />

            <Route
              path="/edit-project/:id"
              element={
                <RequireRole user={user} loading={appLoading} roles={["organizer"]}>
                  <EditProject user={user} />
                </RequireRole>
              }
            />

            {/* Volunteer */}
            <Route
              path="/my-applications"
              element={
                <RequireRole user={user} loading={appLoading} roles={["volunteer"]}>
                  <MyApplications user={user} />
                </RequireRole>
              }
            />
            <Route path="/favorites" element={<Favorites />} />

            {/* Admin */}
            <Route
              path="/admin"
              element={
                <RequireRole user={user} loading={appLoading} roles={["admin"]}>
                  <AdminPanel user={user} />
                </RequireRole>
              }
            />

            {/* Общие (все авторизованные) */}
            <Route
              path="/profile"
              element={
                <RequireAuth user={user} loading={appLoading}>
                  <Profile user={user} onUserUpdate={handleUserUpdate} />
                </RequireAuth>
              }
            />

            <Route
              path="/chat"
              element={
                <RequireAuth user={user} loading={appLoading}>
                  <Chat user={user} />
                </RequireAuth>
              }
            />

            {/* fallback — всегда последним */}
            <Route path="*" element={<Navigate to="/" replace />} />

          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
