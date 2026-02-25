import React, { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import "./AdminPanel.css";

function AdminPanel({ user }) {
  const [tab, setTab] = useState("projects"); // projects | users | reviews | reports

  const [pendingProjects, setPendingProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [query, setQuery] = useState("");

  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);

  const [reportsSummary, setReportsSummary] = useState(null);
  const [userGrowth, setUserGrowth] = useState([]);
  const [projectCategories, setProjectCategories] = useState([]);
  const [projectStatuses, setProjectStatuses] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    fetchPendingProjects();
    fetchUsers();
    fetchReviews();
    fetchReports();
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
      setPendingProjects((prev) => prev.filter((p) => p.id !== projectId));
      fetchReports();
    } catch (e) {
      console.error("Ошибка approve:", e);
      alert("Не удалось одобрить проект");
    }
  };

  const rejectProject = async (projectId) => {
    const reason = window.prompt("Причина отклонения (необязательно):", "");
    try {
      await api.patch(`/api/admin/projects/${projectId}/reject`, { reason: reason || null });
      setPendingProjects((prev) => prev.filter((p) => p.id !== projectId));
      fetchReports();
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
      await api.patch(`/api/admin/users/${id}/block`);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, isBlocked: true } : u)));
    } catch (e) {
      console.error("Ошибка блокировки:", e);
      alert("Не удалось заблокировать пользователя");
    }
  };

  const unblockUser = async (id) => {
    try {
      await api.patch(`/api/admin/users/${id}/unblock`);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, isBlocked: false } : u)));
    } catch (e) {
      console.error("Ошибка разблокировки:", e);
      alert("Не удалось разблокировать пользователя");
    }
  };

  const changeRole = async (id, role) => {
    try {
      await api.patch(`/api/admin/users/${id}/role`, { role });
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
    } catch (e) {
      console.error("Ошибка смены роли:", e);
      alert("Не удалось сменить роль");
    }
  };

  const fetchReviews = async () => {
    setLoadingReviews(true);
    try {
      const res = await api.get("/api/admin/reviews");
      setReviews(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error("Ошибка загрузки отзывов:", e);
      setReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  };

  const deleteReview = async (reviewId) => {
    const ok = window.confirm("Удалить отзыв? Действие необратимо.");
    if (!ok) return;
    try {
      await api.delete(`/api/admin/reviews/${reviewId}`);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      fetchReports();
    } catch (e) {
      console.error("Ошибка удаления отзыва:", e);
      alert("Не удалось удалить отзыв");
    }
  };

  const fetchReports = async () => {
    setLoadingReports(true);
    try {
      const [summaryRes, growthRes, categoriesRes, statusesRes] = await Promise.all([
        api.get("/api/admin/reports/summary"),
        api.get("/api/admin/reports/user-growth?months=12"),
        api.get("/api/admin/reports/project-categories"),
        api.get("/api/admin/reports/project-statuses"),
      ]);

      setReportsSummary(summaryRes.data || null);
      setUserGrowth(Array.isArray(growthRes.data?.items) ? growthRes.data.items : []);
      setProjectCategories(Array.isArray(categoriesRes.data?.items) ? categoriesRes.data.items : []);
      setProjectStatuses(Array.isArray(statusesRes.data?.items) ? statusesRes.data.items : []);
    } catch (e) {
      console.error("Ошибка загрузки отчетов:", e);
      setReportsSummary(null);
      setUserGrowth([]);
      setProjectCategories([]);
      setProjectStatuses([]);
    } finally {
      setLoadingReports(false);
    }
  };

  // -------- CSV export --------
  const escapeCsvCell = (value) => {
    const str = String(value ?? "");
    if (/[",;\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const downloadCsv = (rows, filename) => {
    const csv = rows.map((row) => row.map(escapeCsvCell).join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" }); // BOM for Excel (RU)
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportUsersGrowthCsv = () => {
    const rows = [
      ["Отчет", "Рост пользователей по месяцам"],
      ["Дата экспорта", new Date().toLocaleString("ru-RU")],
      [],
      ["Месяц", "Новых пользователей", "Накопительно"],
      ...userGrowth.map((x) => [x.label || x.month, x.newUsers ?? 0, x.cumulative ?? ""]),
    ];
    downloadCsv(rows, "otchet_rost_polzovatelei.csv");
  };

  const exportCategoriesCsv = () => {
    const rows = [
      ["Отчет", "Популярные категории мероприятий"],
      ["Дата экспорта", new Date().toLocaleString("ru-RU")],
      [],
      ["Категория", "Количество проектов"],
      ...projectCategories.map((x) => [mapProjectType(x.category), x.count ?? 0]),
    ];
    downloadCsv(rows, "otchet_kategorii_proektov.csv");
  };

  const exportStatusesCsv = () => {
    const rows = [
      ["Отчет", "Статусы проектов"],
      ["Дата экспорта", new Date().toLocaleString("ru-RU")],
      [],
      ["Статус", "Количество"],
      ...projectStatuses.map((x) => [mapProjectStatus(x.status), x.count ?? 0]),
    ];
    downloadCsv(rows, "otchet_statusy_proektov.csv");
  };

  const exportSummaryCsv = () => {
    const s = reportsSummary || {};
    const rows = [
      ["Отчет", "Сводные показатели"],
      ["Дата экспорта", new Date().toLocaleString("ru-RU")],
      [],
      ["Показатель", "Значение"],
      ["Пользователи", s.usersTotal ?? 0],
      ["Проекты", s.projectsTotal ?? 0],
      ["Активные проекты", s.activeProjects ?? 0],
      ["Заявки", s.applicationsTotal ?? 0],
      ["Отзывы", s.reviewsTotal ?? 0],
      ["Черновики", s.draftProjects ?? 0],
      ["Завершенные проекты", s.completedProjects ?? 0],
      ["Отмененные проекты", s.cancelledProjects ?? 0],
    ];
    downloadCsv(rows, "otchet_svodnye_pokazateli.csv");
  };

  const exportAllReportsCsv = () => {
    const rows = [
      ["ОТЧЕТЫ АДМИНИСТРАТОРА", ""],
      ["Дата экспорта", new Date().toLocaleString("ru-RU")],
      [],
      ["Сводные показатели", ""],
      ["Показатель", "Значение"],
      ["Пользователи", reportsSummary?.usersTotal ?? 0],
      ["Проекты", reportsSummary?.projectsTotal ?? 0],
      ["Активные проекты", reportsSummary?.activeProjects ?? 0],
      ["Заявки", reportsSummary?.applicationsTotal ?? 0],
      ["Отзывы", reportsSummary?.reviewsTotal ?? 0],
      ["Черновики", reportsSummary?.draftProjects ?? 0],
      ["Завершенные проекты", reportsSummary?.completedProjects ?? 0],
      ["Отмененные проекты", reportsSummary?.cancelledProjects ?? 0],
      [],
      ["Рост пользователей по месяцам", ""],
      ["Месяц", "Новых пользователей", "Накопительно"],
      ...userGrowth.map((x) => [x.label || x.month, x.newUsers ?? 0, x.cumulative ?? ""]),
      [],
      ["Категории проектов", ""],
      ["Категория", "Количество"],
      ...projectCategories.map((x) => [mapProjectType(x.category), x.count ?? 0]),
      [],
      ["Статусы проектов", ""],
      ["Статус", "Количество"],
      ...projectStatuses.map((x) => [mapProjectStatus(x.status), x.count ?? 0]),
    ];
    downloadCsv(rows, "otchety_admina_vse.csv");
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
          <button type="button" className={`tab-btn ${tab === "projects" ? "active" : ""}`} onClick={() => setTab("projects")}>
            🧾 Модерация проектов
          </button>
          <button type="button" className={`tab-btn ${tab === "reviews" ? "active" : ""}`} onClick={() => setTab("reviews")}>
            📝 Модерация отзывов
          </button>
          <button type="button" className={`tab-btn ${tab === "users" ? "active" : ""}`} onClick={() => setTab("users")}>
            👤 Пользователи
          </button>
          <button type="button" className={`tab-btn ${tab === "reports" ? "active" : ""}`} onClick={() => setTab("reports")}>
            📊 Отчёты
          </button>
        </div>
      </div>

      {tab === "projects" && (
        <section className="admin-section">
          <div className="section-header">
            <h2>Проекты на модерации</h2>
            <button type="button" className="admin-btn" onClick={fetchPendingProjects}>🔄 Обновить</button>
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
                      Организатор: {p.creator ? (`${p.creator.firstName || ""} ${p.creator.lastName || ""}`.trim() || `ID ${p.creator.id}`) : "—"}
                    </span>
                    <span className="muted">
                      Дата: {p.startDate ? new Date(p.startDate).toLocaleDateString("ru-RU") : "—"}
                    </span>
                  </div>
                  <div className="card-actions">
                    <button type="button" className="admin-btn success" onClick={() => approveProject(p.id)}>✅ Одобрить</button>
                    <button type="button" className="admin-btn danger" onClick={() => rejectProject(p.id)}>❌ Отклонить</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === "reviews" && (
        <section className="admin-section">
          <div className="section-header">
            <h2>Отзывы</h2>
            <button type="button" className="admin-btn" onClick={fetchReviews}>🔄 Обновить</button>
          </div>
          {loadingReviews ? (
            <div className="admin-loading">Загрузка отзывов...</div>
          ) : reviews.length === 0 ? (
            <div className="admin-empty">Отзывов нет.</div>
          ) : (
            <div className="cards">
              {reviews.map((r) => (
                <div key={r.id} className="card">
                  <div className="card-title">
                    <strong>{r.project?.title || "Проект"}</strong>
                    <span className="muted">ID: {r.id}</span>
                  </div>
                  <div className="card-meta">
                    <span className="muted">Автор: {r.authorName || r.authorEmail || r.authorId || "—"}</span>
                    <span className="muted">Дата: {r.createdAt ? new Date(r.createdAt).toLocaleDateString("ru-RU") : "—"}</span>
                  </div>
                  <div className="card-meta">
                    <span className="muted">Рейтинг: ⭐ {r.rating}</span>
                    <span className="muted">Проект ID: {r.projectId}</span>
                  </div>
                  {r.text && <p className="card-desc">{r.text}</p>}
                  <div className="card-actions">
                    <button type="button" className="admin-btn danger" onClick={() => deleteReview(r.id)}>🗑️ Удалить</button>
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
            <button type="button" className="admin-btn" onClick={fetchUsers}>🔄 Обновить</button>
          </div>
          <div className="admin-toolbar">
            <input className="search" placeholder="Поиск по id / email / имени / роли..." value={query} onChange={(e) => setQuery(e.target.value)} />
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
                    <th>ID</th><th>Email</th><th>Имя</th><th>Роль</th><th>Статус</th><th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id}>
                      <td>{u.id}</td>
                      <td>{u.email || "—"}</td>
                      <td>{`${u.firstName || ""} ${u.lastName || ""}`.trim() || "—"}</td>
                      <td>
                        <select value={u.role} onChange={(e) => changeRole(u.id, e.target.value)}>
                          <option value="volunteer">volunteer</option>
                          <option value="organizer">organizer</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                      <td>{u.isBlocked ? <span className="badge danger">blocked</span> : <span className="badge success">active</span>}</td>
                      <td>
                        {u.isBlocked ? (
                          <button type="button" className="admin-btn" onClick={() => unblockUser(u.id)}>Разблокировать</button>
                        ) : (
                          <button type="button" className="admin-btn danger" onClick={() => blockUser(u.id)}>Заблокировать</button>
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

      {tab === "reports" && (
        <section className="admin-section">
          <div className="section-header">
            <h2>Отчёты и аналитика</h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="admin-btn" onClick={fetchReports}>🔄 Обновить</button>
              <button type="button" className="admin-btn" onClick={exportAllReportsCsv} disabled={loadingReports}>
                ⬇️ Экспорт всех отчетов (CSV)
              </button>
            </div>
          </div>

          {loadingReports ? (
            <div className="admin-loading">Загрузка отчетов...</div>
          ) : (
            <>
              <div className="cards">
                <SummaryCard title="Пользователи" value={reportsSummary?.usersTotal ?? 0} />
                <SummaryCard title="Проекты" value={reportsSummary?.projectsTotal ?? 0} />
                <SummaryCard title="Активные проекты" value={reportsSummary?.activeProjects ?? 0} />
                <SummaryCard title="Заявки" value={reportsSummary?.applicationsTotal ?? 0} />
                <SummaryCard title="Отзывы" value={reportsSummary?.reviewsTotal ?? 0} />
                <SummaryCard title="Черновики" value={reportsSummary?.draftProjects ?? 0} />
              </div>

              <div className="cards" style={{ marginTop: 16 }}>
                <div className="card" style={{ gridColumn: "span 2" }}>
                  <div className="card-title" style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <strong>Рост пользователей по месяцам</strong>
                    <button type="button" className="admin-btn" onClick={exportUsersGrowthCsv}>CSV</button>
                  </div>
                  <SimpleBarChart
                    items={userGrowth.map((x) => ({ label: x.label || x.month, value: x.newUsers }))}
                    emptyText="Нет данных по пользователям"
                  />
                </div>

                <div className="card">
                  <div className="card-title" style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <strong>Популярные категории мероприятий</strong>
                    <button type="button" className="admin-btn" onClick={exportCategoriesCsv}>CSV</button>
                  </div>
                  <SimpleBarChart
                    items={projectCategories.map((x) => ({ label: mapProjectType(x.category), value: x.count }))}
                    emptyText="Нет данных по категориям"
                  />
                </div>

                <div className="card">
                  <div className="card-title" style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <strong>Статусы проектов</strong>
                    <button type="button" className="admin-btn" onClick={exportStatusesCsv}>CSV</button>
                  </div>
                  <SimpleBarChart
                    items={projectStatuses.map((x) => ({ label: mapProjectStatus(x.status), value: x.count }))}
                    emptyText="Нет данных по статусам"
                  />
                </div>

                <div className="card">
                  <div className="card-title" style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <strong>Сводные показатели</strong>
                    <button type="button" className="admin-btn" onClick={exportSummaryCsv}>CSV</button>
                  </div>
                  <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                    <div className="muted" style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Пользователи</span><strong>{reportsSummary?.usersTotal ?? 0}</strong>
                    </div>
                    <div className="muted" style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Проекты</span><strong>{reportsSummary?.projectsTotal ?? 0}</strong>
                    </div>
                    <div className="muted" style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Активные проекты</span><strong>{reportsSummary?.activeProjects ?? 0}</strong>
                    </div>
                    <div className="muted" style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Заявки</span><strong>{reportsSummary?.applicationsTotal ?? 0}</strong>
                    </div>
                    <div className="muted" style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Отзывы</span><strong>{reportsSummary?.reviewsTotal ?? 0}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}

function SummaryCard({ title, value }) {
  return (
    <div className="card">
      <div className="muted" style={{ marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function SimpleBarChart({ items, emptyText }) {
  if (!items || items.length === 0) return <div className="admin-empty">{emptyText}</div>;
  const max = Math.max(...items.map((i) => Number(i.value) || 0), 1);

  return (
    <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
      {items.map((item) => {
        const value = Number(item.value) || 0;
        const width = `${Math.max(4, Math.round((value / max) * 100))}%`;
        return (
          <div key={`${item.label}-${value}`} style={{ display: "grid", gap: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span className="muted" style={{ fontSize: 13 }}>{item.label}</span>
              <strong style={{ fontSize: 13 }}>{value}</strong>
            </div>
            <div style={{ width: "100%", height: 10, borderRadius: 999, background: "#eef2f7", overflow: "hidden" }}>
              <div style={{ width, height: "100%", borderRadius: 999, background: "linear-gradient(90deg, #5b8def, #7c5cff)" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function mapProjectType(type) {
  const map = {
    ECOLOGY: "Экология",
    ANIMAL_WELFARE: "Помощь животным",
    EDUCATION: "Образование",
    SOCIAL: "Социальные",
    CULTURAL: "Культура",
    SPORTS: "Спорт",
    MEDICAL: "Медицина",
    OTHER: "Другое",
  };
  return map[type] || type || "Другое";
}

function mapProjectStatus(status) {
  const map = {
    DRAFT: "Черновик",
    ACTIVE: "Активный",
    COMPLETED: "Завершён",
    CANCELLED: "Отменён",
  };
  return map[status] || status || "Неизвестно";
}

export default AdminPanel;