import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import api from "../api/client";
import { createSocket } from "../api/socket";
import Icon from "./ui/Icon";
import "./Navbar.css";

function Navbar({ user, onLogout }) {
  const [totalUnread, setTotalUnread] = useState(0);
  const socketRef = useRef(null);

  const fetchTotalUnread = async () => {
    if (!user) {
      setTotalUnread(0);
      return;
    }

    try {
      const response = await api.get("/api/messages/conversations");
      const conversations = Array.isArray(response.data) ? response.data : [];
      const total = conversations.reduce((sum, conversation) => sum + (conversation.unreadCount || 0), 0);
      setTotalUnread(total);
    } catch (requestError) {
      console.error("Ошибка подсчета непрочитанных сообщений:", requestError);
    }
  };

  useEffect(() => {
    fetchTotalUnread();
  }, [user?.id]);

  useEffect(() => {
    if (!user) return undefined;

    const socket = createSocket();
    socketRef.current = socket;

    socket.on("connect", fetchTotalUnread);
    socket.on("message:new", fetchTotalUnread);
    socket.on("messages:read", fetchTotalUnread);
    socket.on("unread:count", ({ total }) => setTotalUnread(Number(total) || 0));
    socket.on("connect_error", (requestError) => {
      console.log("Navbar WS error:", requestError.message);
    });

    return () => {
      socket.disconnect();
    };
  }, [user?.id]);

  return (
    <nav className="navbar">
      <div className="navbar-shell">
        <div className="navbar-left">
          <Link to="/" className="navbar-brand">
            <span className="brand-mark" aria-hidden="true" />
            <span>
              <strong>Помогаем вместе</strong>
              <small>волонтерская платформа</small>
            </span>
          </Link>
        </div>

        <div className="navbar-links">
          <Link to="/" className="nav-link">
            <Icon name="home" />
            <span>Проекты</span>
          </Link>

          {user ? (
            <>
              {(user.role === "organizer" || user.role === "admin") && (
                <Link to="/create-project" className="nav-link">
                  <Icon name="add_circle" />
                  <span>Создать проект</span>
                </Link>
              )}

              {(user.role === "organizer" || user.role === "admin") && (
                <Link to="/organizer/calendar" className="nav-link">
                  <Icon name="calendar_month" />
                  <span>Календарь</span>
                </Link>
              )}

              {user.role === "volunteer" && (
                <Link to="/favorites" className="nav-link">
                  <Icon name="favorite" />
                  <span>Избранное</span>
                </Link>
              )}

              {user.role === "volunteer" && (
                <Link to="/my-applications" className="nav-link">
                  <Icon name="description" />
                  <span>Мои заявки</span>
                </Link>
              )}

              {user.role === "admin" && (
                <Link to="/admin" className="nav-link">
                  <Icon name="shield" />
                  <span>Админ-панель</span>
                </Link>
              )}

              <Link to="/profile" className="nav-link nav-link-profile">
                <Icon name="person" />
                <span>Профиль</span>
              </Link>

              <Link to="/chat" className="nav-link chat-link-with-badge">
                <Icon name="chat_bubble" />
                <span>Сообщения</span>
                {totalUnread > 0 ? <span className="nav-badge-dot">{totalUnread > 99 ? "99+" : totalUnread}</span> : null}
              </Link>

              <button onClick={onLogout} className="logout-btn" type="button">
                <Icon name="logout" />
                <span>Выйти</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">
                <Icon name="login" />
                <span>Войти</span>
              </Link>
              <Link to="/register" className="nav-link nav-link-emphasis">
                <Icon name="how_to_reg" />
                <span>Регистрация</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
