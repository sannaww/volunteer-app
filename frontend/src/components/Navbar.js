import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./Navbar.css";

import api from "../api/client";
import { createSocket } from "../api/socket";

function Navbar({ user, onLogout }) {
  const [totalUnread, setTotalUnread] = useState(0);
  const socketRef = useRef(null);

  const fetchTotalUnread = async () => {
    if (!user) {
      setTotalUnread(0);
      return;
    }
    try {
      const res = await api.get("/api/messages/conversations");
      const convs = res.data || [];
      const sum = convs.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
      setTotalUnread(sum);
    } catch (e) {
      // не спамим алертами, просто в консоль
      console.error("Ошибка при подсчете unread:", e);
    }
  };

  // 1) при входе/смене пользователя — получить initial unread
  useEffect(() => {
    fetchTotalUnread();
  }, [user?.id]);

  // 2) слушаем WS события и обновляем unread
  useEffect(() => {
    if (!user) return;

    const s = createSocket();
    socketRef.current = s;

    s.on("connect", () => {
      // на всякий случай обновим при коннекте
      fetchTotalUnread();
    });

    // При новом входящем сообщении — обновляем unread
    s.on("message:new", () => {
      fetchTotalUnread();
    });

    // Когда что-то отмечено как прочитанное — тоже обновим
    s.on("messages:read", () => {
      fetchTotalUnread();
    });

    // Если вдруг переподключение/ошибка
    s.on("connect_error", (e) => {
      console.log("Navbar WS error:", e.message);
    });

    return () => {
      s.disconnect();
    };
  }, [user?.id]);

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <div className="navbar-brand">
          <Link to="/">Волонтерские проекты</Link>
        </div>

        {user && (
          <div className="user-welcome-nav">
            Привет, {user.firstName}!
            {user?.role === "volunteer" && typeof user.points === "number" && (
              <span style={{ marginLeft: 10 }}>⭐ {user.points}</span>
            )}
          </div>
        )}
      </div>

      <div className="navbar-links">
        <Link to="/">Все проекты</Link>

        {user ? (
          <>
            {user.role === "organizer" && (
              <>
                <Link to="/create-project">Создать проект</Link>
                <Link to="/organizer/calendar">Календарь</Link>
              </>
            )}

            {user.role === "admin" && <Link to="/organizer/calendar">Календарь</Link>}

            {user.role === "volunteer" && <Link to="/favorites">Избранное</Link>}

            {user.role === "volunteer" && <Link to="/my-applications">Мои заявки</Link>}

            {user?.role === "admin" && (
              <Link to="/admin" className="nav-link">
                Админ
              </Link>
            )}

            <Link to="/profile">Личный кабинет</Link>

            {/* ✅ Сообщения + красная точка */}
            <Link to="/chat" className="chat-link-with-badge">
              💬 Сообщения
              {totalUnread > 0 && <span className="nav-badge-dot" />}
            </Link>

            <button onClick={onLogout} className="logout-btn">
              Выйти
            </button>
          </>
        ) : (
          <>
            <Link to="/">Все проекты</Link>
            <Link to="/login">Войти</Link>
            <Link to="/register">Регистрация</Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
