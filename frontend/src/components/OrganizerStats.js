import React, { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import "./OrganizerStats.css";

function OrganizerStats({ user }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Нормализация статусов (потому что может быть "approved" / "APPROVED")
  const norm = (s) => (s ? String(s).toUpperCase() : "");

  const getStatusText = (status) => {
    const statusMap = {
      PENDING: "⏳ На рассмотрении",
      APPROVED: "✅ Одобрена",
      REJECTED: "❌ Отклонена",
      DRAFT: "📝 Черновик",
      ACTIVE: "🟢 Активный",
      COMPLETED: "✅ Завершен",
      CANCELLED: "🔴 Отменен",
    };
    return statusMap[status] || status;
  };

  useEffect(() => {
    if (!user || user.role !== "organizer") {
      setLoading(false);
      return;
    }
    fetchStats();
    // eslint-disable-next-line
  }, [user]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      /**
       * 1) Забираем проекты (как минимум "все проекты").
       * Если у тебя есть спец-эндпоинт "мои проекты" — можно заменить на него.
       */
      const projectsRes = await api.get("/api/projects");
      const allProjects = Array.isArray(projectsRes.data) ? projectsRes.data : [];

      // Фильтруем проекты текущего организатора
      const myProjects = allProjects.filter((p) => {
        const creatorId = p?.creator?.id ?? p?.creatorId;
        return Number(creatorId) === Number(user.id);
      });

      // 2) По каждому проекту получаем заявки (организатор имеет доступ через gateway RBAC)
      const applicationsByProject = await Promise.all(
        myProjects.map(async (p) => {
          try {
            const r = await api.get(`/api/applications/project/${p.id}`);
            return { project: p, applications: Array.isArray(r.data) ? r.data : [] };
          } catch (e) {
            // Если на каком-то проекте ошибка — не валим всю страницу
            console.error(
  "Не удалось загрузить заявки по проекту",
  p?.id,
  e?.response?.status,
  e?.response?.data || e.message
);
            return { project: p, applications: [] };
          }
        })
      );

      // 3) Агрегации
      const projectsByStatus = {};
      for (const p of myProjects) {
        const s = norm(p?.status || "ACTIVE");
        projectsByStatus[s] = (projectsByStatus[s] || 0) + 1;
      }

      let applicationsTotal = 0;
      const applicationsByStatus = {};
      const volunteerIds = new Set();

      // Для "последних заявок" (в UI у тебя ожидаются поля volunteerName/projectTitle/status/createdAt)
      const recentAppsFlat = [];

      // Для "популярного проекта"
      let popularProject = null;

      for (const item of applicationsByProject) {
        const project = item.project;
        const apps = item.applications;

        applicationsTotal += apps.length;

        // популярный проект = больше всего заявок
        if (!popularProject || apps.length > popularProject.applicationsCount) {
          popularProject = {
            title: project?.title || "Проект",
            applicationsCount: apps.length,
          };
        }

        for (const a of apps) {
          const st = norm(a?.status || "PENDING");
          applicationsByStatus[st] = (applicationsByStatus[st] || 0) + 1;

          // уникальные волонтеры — пытаемся достать volunteerId (как бы он ни назывался)
          const vId = a?.userId ?? a?.user?.id;

const vFirst = a?.user?.firstName;
const vLast = a?.user?.lastName;

const volunteerName =
  vFirst || vLast
    ? `${vFirst || ""} ${vLast || ""}`.trim()
    : vId != null
      ? `Волонтер #${vId}`
      : "Волонтер";

          recentAppsFlat.push({
            id: a?.id ?? `${project?.id}-${Math.random()}`,
            volunteerName,
            projectTitle: project?.title || "Проект",
            status: st,
            createdAt: a?.createdAt || new Date().toISOString(),
          });
        }
      }

      // сортируем последние заявки по createdAt desc и берём топ-5
      recentAppsFlat.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const recentApplications = recentAppsFlat.slice(0, 5);

      const computed = {
        projects: {
          total: myProjects.length,
          byStatus: projectsByStatus,
        },
        applications: {
          total: applicationsTotal,
          byStatus: applicationsByStatus,
          uniqueVolunteers: volunteerIds.size,
        },
        popularProject,
        recentApplications,
      };

      setStats(computed);
    } catch (error) {
      console.error("Ошибка при загрузке статистики:", error);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  // Guard после хуков
  if (!user) return <div className="loading">Загрузка пользователя...</div>;
  if (user.role !== "organizer") return <div className="error">Доступно только организатору</div>;
  if (loading) return <div className="loading">Загрузка статистики...</div>;
  if (!stats) return <div className="error">Не удалось загрузить статистику</div>;

  return (
    <div className="organizer-stats">
      <div className="stats-header">
        <h2>Статистика организатора</h2>
        <button className="btn-refresh" onClick={fetchStats} type="button">
          🔄 Обновить
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>{stats.projects.total}</h3>
            <p>Всего проектов</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📨</div>
          <div className="stat-content">
            <h3>{stats.applications.total}</h3>
            <p>Всего заявок</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>{stats.applications.uniqueVolunteers}</h3>
            <p>Уникальных волонтеров</p>
          </div>
        </div>

        {stats.popularProject && (
          <div className="stat-card">
            <div className="stat-icon">🔥</div>
            <div className="stat-content">
              <h3>{stats.popularProject.applicationsCount}</h3>
              <p>Заявок на “{stats.popularProject.title}”</p>
            </div>
          </div>
        )}
      </div>

      <div className="detailed-stats">
        <div className="stats-section">
          <h3>Проекты по статусам</h3>
          <div className="status-stats">
            {Object.entries(stats.projects.byStatus).map(([status, count]) => (
              <div key={status} className="status-item">
                <span className="status-label">{getStatusText(status)}</span>
                <span className="status-count">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="stats-section">
          <h3>Заявки по статусам</h3>
          <div className="status-stats">
            {Object.entries(stats.applications.byStatus).map(([status, count]) => (
              <div key={status} className="status-item">
                <span className="status-label">{getStatusText(status)}</span>
                <span className="status-count">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {stats.recentApplications.length > 0 && (
        <div className="recent-applications">
          <h3>Последние заявки</h3>
          <div className="applications-list">
            {stats.recentApplications.map((app) => (
              <div key={app.id} className="application-item">
                <div className="app-info">
                  <strong>{app.volunteerName}</strong>
                  <span> подал(а) заявку на “{app.projectTitle}”</span>
                </div>
                <div className="app-meta">
                  <span className={`status status-${app.status.toLowerCase()}`}>
                    {getStatusText(app.status)}
                  </span>
                  <span>{new Date(app.createdAt).toLocaleDateString("ru-RU")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.projects.total === 0 && (
        <div className="empty-stats">
          <p>У вас пока нет проектов</p>
          <p>Создайте первый проект, чтобы увидеть статистику</p>
          <button
            className="btn btn-primary"
            onClick={() => (window.location.href = "/create-project")}
            type="button"
          >
            Создать проект
          </button>
        </div>
      )}
    </div>
  );
}

export default OrganizerStats;
