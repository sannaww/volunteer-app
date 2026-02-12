import React, { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import "./AdminPanel.css";

function AdminPanel({ user }) {
  const [tab, setTab] = useState("projects"); // projects | users

  // --- Projects moderation ---
  const [pendingProjects, setPendingProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  // --- Users management ---
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [query, setQuery] = useState("");

  // Guard
  useEffect(() => {
    // если user ещё не пришёл — просто не грузим
    if (!user) return;
    if (user.role !== "admin") return;

    // по умолчанию грузим обе вкладки, чтобы переключение было мгновенным
    fetchPendingProjects();
    fetchUsers();
    // eslint-disable-next-line
  }, [user]);

  const fetchPendingProjects = async () => {
    setLoadingProjects(true);
    try {
      const res = await api.get("/api/admin/projects/pending");
      setPendingProjects(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error("Ошибка загрузки проектов на модерации:", e);
      setPendingProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  const approveProject = async (projectId) => {
    try {
      await api.patch(`/api/admin/projects/${projectId}/approve`);
      // обновляем список
      setPendingProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch (e) {
      console.error("Ошибка approve:", e);
      alert("Не удалось одобрить проект");
    }
  };

  const rejectProject = async (projectId) => {
    // минимальный дипломный вариант: причина через prompt
    const reason = window.prompt("Причина отклонения (необязательно):", "");
    try {
      await api.patch(`/api/admin/projects/${projectId}/reject`, {
        reason: reason || null,
      });
      setPendingProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch (e) {
      console.error("Ошибка reject:", e);
      alert("Не удалось отклонить проект");
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await api.get("/api/admin/users");
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error("Ошибка загрузки пользователей:", e);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const blockUser = async (id) => {
    try {
      const res = await api.patch(`/api/admin/users/${id}/block`);
      // сервер может вернуть обновлённого пользователя — но мы обновим локально безопасно
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, isBlocked: true } : u))
      );
      return res.data;
    } catch (e) {
      console.error("Ошибка блокировки:", e);
      alert("Не удалось заблокировать пользователя");
    }
  };

  const unblockUser = async (id) => {
    try {
      const res = await api.patch(`/api/admin/users/${id}/unblock`);
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, isBlocked: false } : u))
      );
      return res.data;
    } catch (e) {
      console.error("Ошибка разблокировки:", e);
      alert("Не удалось разблокировать пользователя");
    }
  };

  const changeRole = async (id, role) => {
    try {
      const res = await api.patch(`/api/admin/users/${id}/role`, { role });
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
      return res.data;
    } catch (e) {
      console.error("Ошибка смены роли:", e);
      alert("Не удалось сменить роль");
    }
  };

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const hay = `${u.id} ${u.email || ""} ${u.firstName || ""} ${u.lastName || ""} ${u.role || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [users, query]);

  if (!user) return <div className="admin-loading">Загрузка...</div>;
  if (user.role !== "admin") {
    return (
      <div className="admin-error">
        <h2>Доступ запрещён</h2>
        <p>Эта страница доступна только администратору.</p>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>Админ-панель</h1>

        <div className="admin-tabs">
          <button
            type="button"
            className={`tab-btn ${tab === "projects" ? "active" : ""}`}
            onClick={() => setTab("projects")}
          >
            🧾 Модерация проектов
          </button>
          <button
            type="button"
            className={`tab-btn ${tab === "users" ? "active" : ""}`}
            onClick={() => setTab("users")}
          >
            👤 Пользователи
          </button>
        </div>
      </div>

      {tab === "projects" && (
        <section className="admin-section">
          <div className="section-header">
            <h2>Проекты на модерации</h2>
            <button type="button" className="admin-btn" onClick={fetchPendingProjects}>
              🔄 Обновить
            </button>
          </div>

          {loadingProjects ? (
            <div className="admin-loading">Загрузка проектов...</div>
          ) : pendingProjects.length === 0 ? (
            <div className="admin-empty">Нет проектов, ожидающих модерации.</div>
          ) : (
            <div className="cards">
              {pendingProjects.map((p) => (
                <div key={p.id} className="card">
                  <div className="card-title">
                    <strong>{p.title}</strong>
                    <span className="muted">ID: {p.id}</span>
                  </div>

                  {p.description && <p className="card-desc">{p.description}</p>}

                  <div className="card-meta">
                    <span className="muted">
                      Организатор:{" "}
                      {p.creator
                        ? `${p.creator.firstName || ""} ${p.creator.lastName || ""}`.trim() || `ID ${p.creator.id}`
                        : "—"}
                    </span>
                    <span className="muted">
                      Дата:{" "}
                      {p.startDate
                        ? new Date(p.startDate).toLocaleDateString("ru-RU")
                        : "—"}
                    </span>
                  </div>

                  <div className="card-actions">
                    <button
                      type="button"
                      className="admin-btn success"
                      onClick={() => approveProject(p.id)}
                    >
                      ✅ Одобрить
                    </button>
                    <button
                      type="button"
                      className="admin-btn danger"
                      onClick={() => rejectProject(p.id)}
                    >
                      ❌ Отклонить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === "users" && (
        <section className="admin-section">
          <div className="section-header">
            <h2>Пользователи</h2>
            <button type="button" className="admin-btn" onClick={fetchUsers}>
              🔄 Обновить
            </button>
          </div>

          <div className="admin-toolbar">
            <input
              className="search"
              placeholder="Поиск по id / email / имени / роли..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {loadingUsers ? (
            <div className="admin-loading">Загрузка пользователей...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="admin-empty">Пользователи не найдены.</div>
          ) : (
            <div className="table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Email</th>
                    <th>Имя</th>
                    <th>Роль</th>
                    <th>Статус</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id}>
                      <td>{u.id}</td>
                      <td>{u.email || "—"}</td>
                      <td>
                        {`${u.firstName || ""} ${u.lastName || ""}`.trim() || "—"}
                      </td>
                      <td>
                        <select
                          value={u.role}
                          onChange={(e) => changeRole(u.id, e.target.value)}
                        >
                          <option value="volunteer">volunteer</option>
                          <option value="organizer">organizer</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                      <td>
                        {u.isBlocked ? (
                          <span className="badge danger">blocked</span>
                        ) : (
                          <span className="badge success">active</span>
                        )}
                      </td>
                      <td>
                        {u.isBlocked ? (
                          <button
                            type="button"
                            className="admin-btn"
                            onClick={() => unblockUser(u.id)}
                          >
                            Разблокировать
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="admin-btn danger"
                            onClick={() => blockUser(u.id)}
                          >
                            Заблокировать
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default AdminPanel;
