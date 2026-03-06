import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from "react-router-dom";

import api from "./api/client";
import "./App.css";

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
import { FeedbackProvider } from "./components/ui/FeedbackProvider";
import { clearSession, getSessionToken, getSessionUser, setSessionUser } from "./utils/authSession";
import { normalizeRole } from "./utils/formatters";

function normalizeUser(userData) {
  if (!userData || typeof userData !== "object") return userData;
  return {
    ...userData,
    role: normalizeRole(userData.role),
  };
}

function RequireAuth({ user, loading, children }) {
  const location = useLocation();

  if (loading) return <div className="app-loading">Загрузка приложения...</div>;

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
}

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

  useEffect(() => {
    const init = async () => {
      try {
        const token = getSessionToken();

        if (!token) {
          setUser(null);
          return;
        }

        const savedUser = getSessionUser();
        if (savedUser) {
          setUser(normalizeUser(savedUser));
        }

        const response = await api.get("/api/auth/me");
        const normalizedUser = normalizeUser(response.data);
        setUser(normalizedUser);
        setSessionUser(normalizedUser);
      } catch (error) {
        console.error("Ошибка инициализации пользователя:", error);
        clearSession();
        setUser(null);
      } finally {
        setAppLoading(false);
      }
    };

    init();
  }, []);

  const handleLogin = (userData) => {
    const normalizedUser = normalizeUser(userData);
    setUser(normalizedUser);
    setSessionUser(normalizedUser);
  };

  const handleLogout = () => {
    clearSession();
    setUser(null);
  };

  const handleUserUpdate = (updatedUser) => {
    const normalizedUser = normalizeUser(updatedUser);
    setUser(normalizedUser);
    setSessionUser(normalizedUser);
  };

  return (
    <FeedbackProvider>
      <Router>
        <div className="App">
          <Navbar user={user} onLogout={handleLogout} />
          <main className="app-main">
            <Routes>
              <Route path="/" element={<ProjectList user={user} />} />
              <Route path="/register" element={<Register onLogin={handleLogin} />} />
              <Route path="/login" element={<Login onLogin={handleLogin} />} />
              <Route
                path="/organizer/calendar"
                element={
                  <RequireRole user={user} loading={appLoading} roles={["organizer", "admin"]}>
                    <OrganizerCalendar />
                  </RequireRole>
                }
              />
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
              <Route
                path="/admin"
                element={
                  <RequireRole user={user} loading={appLoading} roles={["admin"]}>
                    <AdminPanel user={user} />
                  </RequireRole>
                }
              />
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
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </FeedbackProvider>
  );
}

export default App;
