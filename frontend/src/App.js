import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";

import api from "./api/client";

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
import OrganizerCalendar from "./components/OrganizerCalendar";

import "./App.css";

// ✅ защищённый доступ: если нет user -> /login, но запоминаем куда хотели попасть
function RequireAuth({ user, loading, children }) {
  const location = useLocation();

  if (loading) return <div className="app-loading">Загрузка приложения...</div>;

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
}

// ✅ доступ по ролям: если нет user -> /login (и запоминаем from)
// если роль не подходит -> на главную
function RequireRole({ user, loading, roles = [], children }) {
  const location = useLocation();

  if (loading) return <div className="app-loading">Загрузка приложения...</div>;

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (!roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  const [user, setUser] = useState(null);
  const [appLoading, setAppLoading] = useState(true);

  // ✅ Нормальная инициализация: если есть token — подтягиваем user с backend
  useEffect(() => {
    const init = async () => {
      try {
        const token = sessionStorage.getItem("token");

        // нет токена — не авторизованы
        if (!token) {
          setUser(null);
          return;
        }

        // 1) быстрый fallback из sessionStorage (чтобы UI не пустовал)
        const savedUser = sessionStorage.getItem("user");
        if (savedUser) {
          try {
            setUser(JSON.parse(savedUser));
          } catch {
            // ignore
          }
        }

        // 2) источник истины — backend (роль/имя/блокировка и т.д.)
        const res = await api.get("/api/auth/me");
        setUser(res.data);
        sessionStorage.setItem("user", JSON.stringify(res.data));
      } catch (error) {
        console.error("Ошибка инициализации пользователя:", error);
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("user");
        setUser(null);
      } finally {
        setAppLoading(false);
      }
    };

    init();
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    sessionStorage.setItem("user", JSON.stringify(userData));
  };

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    setUser(null);
  };

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
    sessionStorage.setItem("user", JSON.stringify(updatedUser));
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

            {/* ✅ Organizer Calendar — ВАЖНО: ДО fallback */}
            <Route
              path="/organizer/calendar"
              element={
                <RequireRole user={user} loading={appLoading} roles={["organizer", "admin"]}>
                  <OrganizerCalendar />
                </RequireRole>
              }
            />

            {/* Organizer */}
            <Route
              path="/create-project"
              element={
                <RequireRole user={user} loading={appLoading} roles={["organizer", "admin"]}>
                  <CreateProject user={user} />
                </RequireRole>
              }
            />

            <Route
              path="/project-applications/:projectId"
              element={
                <RequireRole user={user} loading={appLoading} roles={["organizer", "admin"]}>
                  <ProjectApplications user={user} />
                </RequireRole>
              }
            />

            <Route
              path="/edit-project/:id"
              element={
                <RequireRole user={user} loading={appLoading} roles={["organizer", "admin"]}>
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

            <Route
              path="/favorites"
              element={
                <RequireRole user={user} loading={appLoading} roles={["volunteer"]}>
                  <Favorites />
                </RequireRole>
              }
            />

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
