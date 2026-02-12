import React, { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import "./AdminDashboard.css";

function AdminDashboard({ user, onOpenFullAdmin }) {
  const [loading, setLoading] = useState(true);

  const [pendingProjects, setPendingProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");

  const refresh = async () => {
    setLoading(true);
    try {
      const [pRes, uRes] = await Promise.all([
        api.get("/api/admin/projects/pending"),
        api.get("/api/admin/users"),
      ]);

      setPendingProjects(Array.isArray(pRes.data) ? pRes.data : []);
      setUsers(Array.isArray(uRes.data) ? uRes.data : []);
    } catch (e) {
      console.error("AdminDashboard refresh error:", e);
      setPendingProjects([]);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    refresh();
    // eslint-disable-next-line
  }, [user?.id]);

  const approveProject = async (projectId) => {
    try {
      await api.patch(`/api/admin/projects/${projectId}/approve`);
      setPendingProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch (e) {
      console.error("approve error:", e);
      alert("Не удалось одобрить проект");
    }
  };

  const rejectProject = async (projectId) => {
    const reason = window.prompt("Причина отклонения (необязательно):", "");
    try {
      await api.patch(`/api/admin/projects/${projectId}/reject`, {
        reason: reason || null,
      });
      setPendingProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch (e) {
      console.error("reject error:", e);
      alert("Не удалось отклонить проект");
    }
  };

  const blockUser = async (id) => {
    try {
      await api.patch(`/api/admin/users/${id}/block`);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, isBlocked: true } : u)));
    } catch (e) {
      console.error("block error:", e);
      alert("Не удалось заблокировать пользователя");
    }
  };

  const unblockUser = async (id) => {
    try {
      await api.patch(`/api/admin/users/${id}/unblock`);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, isBlocked: false } : u)));
    } catch (e) {
      console.error("unblock error:", e);
      alert("Не удалось разблокировать пользователя");
    }
  };

  const changeRole = async (id, role) => {
    try {
      await api.patch(`/api/admin/users/${id}/role`, { role });
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
    } catch (e) {
      console.error("role error:", e);
      alert("Не удалось сменить роль");
    }
  };

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users.slice(0, 8); // компактно в ЛК
    return users
      .filter((u) => {
        const hay = `${u.id} ${u.email || ""} ${u.firstName || ""} ${u.lastName || ""} ${u.role || ""}`
          .toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 12);
  }, [users, query]);

  const blockedCount = users.filter((u) => u.isBlocked).length;

  if (!user) return null;
  if (user.role !== "admin") return <div className="admin-mini-error">Доступ только администратору.</div>;

  return (
    <div className="admin-mini">
      <div className="admin-mini-header">
        <div>
          <h2>Админ-панель (в ЛК)</h2>
          <p className="muted">
            Быстрые действия и обзор. Полный интерфейс — на отдельной странице.
          </p>
        </div>

        <div className="admin-mini-actions">
          <button className="admin-mini-btn" type="button" onClick={refresh}>
            🔄 Обновить
          </button>
          <button
            className="admin-mini-btn primary"
            type="button"
            onClick={onOpenFullAdmin}
          >
            ↗ Открыть полную панель
          </button>
        </div>
      </div>

      {loading ? (
        <div className="admin-mini-loading">Загрузка админ-данных...</div>
      ) : (
        <>
          <div className="admin-mini-grid">
            <div className="admin-mini-card">
              <div className="card-title">Проектов на модерации</div>
              <div className="card-value">{pendingProjects.length}</div>
            </div>

            <div className="admin-mini-card">
              <div className="card-title">Пользователей</div>
              <div className="card-value">{users.length}</div>
            </div>

            <div className="admin-mini-card">
              <div className="card-title">Заблокировано</div>
              <div className="card-value">{blockedCount}</div>
            </div>
          </div>

          <div className="admin-mini-sections">
            <section className="admin-mini-section">
              <div className="section-head">
                <h3>Быстрая модерация (последние)</h3>
              </div>

              {pendingProjects.length === 0 ? (
                <div className="empty">Нет проектов на модерации</div>
              ) : (
                <div className="mini-list">
                  {pendingProjects.slice(0, 6).map((p) => (
                    <div key={p.id} className="mini-item">
                      <div className="mini-main">
                        <strong>{p.title}</strong>
                        <div className="muted small">
                          ID: {p.id} · Организатор:{" "}
                          {p.creator
                            ? `${p.creator.firstName || ""} ${p.creator.lastName || ""}`.trim() || `ID ${p.creator.id}`
                            : "—"}
                        </div>
                      </div>

                      <div className="mini-actions">
                        <button
                          className="admin-mini-btn success"
                          type="button"
                          onClick={() => approveProject(p.id)}
                        >
                          ✅
                        </button>
                        <button
                          className="admin-mini-btn danger"
                          type="button"
                          onClick={() => rejectProject(p.id)}
                        >
                          ❌
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="admin-mini-section">
              <div className="section-head">
                <h3>Пользователи (быстро)</h3>
                <input
                  className="admin-mini-search"
                  placeholder="Поиск по email/имени/роли..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              {filteredUsers.length === 0 ? (
                <div className="empty">Пользователи не найдены</div>
              ) : (
                <div className="mini-users">
                  {filteredUsers.map((u) => (
                    <div key={u.id} className="user-row">
                      <div className="user-main">
                        <div className="user-name">
                          {`${u.firstName || ""} ${u.lastName || ""}`.trim() || `User #${u.id}`}
                        </div>
                        <div className="muted small">{u.email || "—"}</div>
                      </div>

                      <div className="user-controls">
                        <select
                          value={u.role}
                          onChange={(e) => changeRole(u.id, e.target.value)}
                        >
                          <option value="volunteer">volunteer</option>
                          <option value="organizer">organizer</option>
                          <option value="admin">admin</option>
                        </select>

                        {u.isBlocked ? (
                          <button
                            className="admin-mini-btn"
                            type="button"
                            onClick={() => unblockUser(u.id)}
                          >
                            Разбл.
                          </button>
                        ) : (
                          <button
                            className="admin-mini-btn danger"
                            type="button"
                            onClick={() => blockUser(u.id)}
                          >
                            Блок.
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

export default AdminDashboard;
