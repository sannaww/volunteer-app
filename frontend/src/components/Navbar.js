import React from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

function Navbar({ user, onLogout }) {
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
              <span style={{ marginLeft: 10 }}>
                ⭐ {user.points}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="navbar-links">
        <Link to="/">Все проекты</Link>

        {user ? (
          <>
            {/* organizer */}
            {user.role === 'organizer' && (
              <>
                <Link to="/create-project">Создать проект</Link>
                <Link to="/organizer/calendar">Календарь</Link>
              </>
            )}

            {/* admin тоже может видеть календарь */}
            {user.role === 'admin' && (
              <Link to="/organizer/calendar">Календарь</Link>
            )}

            {/* volunteer */}
            {user.role === 'volunteer' && (
              <Link to="/favorites">Избранное</Link>
            )}

            {/* volunteer */}
            {user.role === 'volunteer' && (
              <Link to="/my-applications">Мои заявки</Link>
            )}

            {/* admin */}
            {user?.role === "admin" && (
              <Link to="/admin" className="nav-link">
                Админ
              </Link>
            )}

            <Link to="/profile">Личный кабинет</Link>
            <Link to="/chat">💬 Сообщения</Link>

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
