import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../api/client";
import { formatDate } from "../utils/formatters";
import {
  getApplicationStatusMeta,
  getProjectStatusMeta,
} from "../utils/presentation";
import EmptyState from "./ui/EmptyState";
import Icon from "./ui/Icon";
import StatusPill from "./ui/StatusPill";
import { useFeedback } from "./ui/FeedbackProvider";
import "./OrganizerStats.css";

function OrganizerStats({ user }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const { error } = useFeedback();

  const normalizeStatus = (value) => String(value || "").toUpperCase();

  const fetchStats = async () => {
    setLoading(true);

    try {
      const projectsResponse = await api.get("/api/projects");
      const allProjects = Array.isArray(projectsResponse.data) ? projectsResponse.data : [];
      const myProjects = allProjects.filter((project) => {
        const creatorId = project?.creator?.id ?? project?.creatorId ?? project?.createdBy;
        return Number(creatorId) === Number(user?.id);
      });

      const applicationsByProject = await Promise.all(
        myProjects.map(async (project) => {
          try {
            const response = await api.get(`/api/applications/project/${project.id}`);
            return {
              project,
              applications: Array.isArray(response.data) ? response.data : [],
            };
          } catch (requestError) {
            console.error("Не удалось загрузить заявки по проекту:", project?.id, requestError);
            return { project, applications: [] };
          }
        })
      );

      const projectsByStatus = {};
      myProjects.forEach((project) => {
        const status = normalizeStatus(project.status || "ACTIVE");
        projectsByStatus[status] = (projectsByStatus[status] || 0) + 1;
      });

      let applicationsTotal = 0;
      const applicationsByStatus = {};
      const volunteerIds = new Set();
      const recentApplications = [];
      let popularProject = null;

      applicationsByProject.forEach(({ project, applications }) => {
        applicationsTotal += applications.length;

        if (!popularProject || applications.length > popularProject.applicationsCount) {
          popularProject = {
            title: project?.title || "Проект",
            applicationsCount: applications.length,
          };
        }

        applications.forEach((application) => {
          const status = normalizeStatus(application.status || "PENDING");
          applicationsByStatus[status] = (applicationsByStatus[status] || 0) + 1;

          const volunteerId = application?.userId ?? application?.user?.id;
          if (volunteerId != null) {
            volunteerIds.add(String(volunteerId));
          }

          recentApplications.push({
            id: application?.id ?? `${project?.id}-${recentApplications.length}`,
            projectTitle: project?.title || "Проект",
            volunteerName:
              application?.user?.firstName || application?.user?.lastName
                ? `${application.user?.firstName || ""} ${application.user?.lastName || ""}`.trim()
                : volunteerId != null
                ? `Волонтёр #${volunteerId}`
                : "Волонтёр",
            status,
            createdAt: application?.createdAt,
          });
        });
      });

      recentApplications.sort(
        (left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0)
      );

      setStats({
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
        recentApplications: recentApplications.slice(0, 5),
      });
    } catch (requestError) {
      console.error("Ошибка при загрузке статистики организатора:", requestError);
      setStats(null);
      error("Не удалось загрузить статистику организатора");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || user.role !== "organizer") {
      setLoading(false);
      return;
    }

    fetchStats();
  }, [user?.id]);

  if (!user) {
    return <div className="loading">Загрузка пользователя...</div>;
  }

  if (user.role !== "organizer") {
    return <div className="error">Статистика доступна только организатору.</div>;
  }

  if (loading) {
    return <div className="loading">Загрузка статистики...</div>;
  }

  if (!stats) {
    return <div className="error">Не удалось загрузить статистику.</div>;
  }

  if (stats.projects.total === 0) {
    return (
      <div className="organizer-stats">
        <div className="stats-header">
          <div>
            <p className="section-kicker">Аналитика</p>
            <h2>Статистика организатора</h2>
            <p>Как только появится первый проект, здесь соберутся метрики по заявкам и активности.</p>
          </div>
        </div>

        <EmptyState
          icon="bar_chart"
          title="Статистика пока пуста"
          description="Создайте первый проект, чтобы увидеть воронку заявок и динамику по участникам."
          action={
            <button className="btn btn-primary" type="button" onClick={() => navigate("/create-project")}>
              <Icon name="add_circle" />
              <span>Создать проект</span>
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="organizer-stats">
      <div className="stats-header">
        <div>
          <p className="section-kicker">Аналитика</p>
          <h2>Статистика организатора</h2>
          <p>Сводка по проектам, заявкам и вовлечённости волонтёров.</p>
        </div>

        <button className="btn btn-secondary" type="button" onClick={fetchStats}>
          <Icon name="refresh" />
          <span>Обновить</span>
        </button>
      </div>

      <div className="stats-grid">
        <StatCard icon="folder_open" value={stats.projects.total} label="Всего проектов" />
        <StatCard icon="assignment" value={stats.applications.total} label="Всего заявок" />
        <StatCard
          icon="groups"
          value={stats.applications.uniqueVolunteers}
          label="Уникальных волонтёров"
        />
        <StatCard
          icon="local_fire_department"
          value={stats.popularProject?.applicationsCount ?? 0}
          label={stats.popularProject ? `Лидер: ${stats.popularProject.title}` : "Популярный проект"}
        />
      </div>

      <div className="stats-sections">
        <section className="stats-section-card">
          <div className="stats-section-head">
            <h3>Проекты по статусам</h3>
          </div>
          <div className="status-stats">
            {Object.entries(stats.projects.byStatus).map(([status, count]) => {
              const meta = getProjectStatusMeta(status);

              return (
                <div key={status} className="status-item">
                  <StatusPill label={meta.label} tone={meta.tone} />
                  <strong>{count}</strong>
                </div>
              );
            })}
          </div>
        </section>

        <section className="stats-section-card">
          <div className="stats-section-head">
            <h3>Заявки по статусам</h3>
          </div>
          <div className="status-stats">
            {Object.entries(stats.applications.byStatus).map(([status, count]) => {
              const meta = getApplicationStatusMeta(status);

              return (
                <div key={status} className="status-item">
                  <StatusPill label={meta.label} tone={meta.tone} />
                  <strong>{count}</strong>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <section className="stats-section-card">
        <div className="stats-section-head">
          <h3>Последние заявки</h3>
        </div>

        {stats.recentApplications.length === 0 ? (
          <EmptyState
            icon="inbox"
            title="Пока нет новых заявок"
            description="Как только волонтёры начнут откликаться, здесь появятся последние обращения."
          />
        ) : (
          <div className="applications-list">
            {stats.recentApplications.map((application) => {
              const meta = getApplicationStatusMeta(application.status);

              return (
                <article key={application.id} className="application-item">
                  <div className="application-main">
                    <strong>{application.volunteerName}</strong>
                    <span>{application.projectTitle}</span>
                  </div>
                  <div className="application-meta">
                    <StatusPill label={meta.label} tone={meta.tone} />
                    <span>{formatDate(application.createdAt)}</span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ icon, value, label }) {
  return (
    <article className="stat-card">
      <div className="stat-icon">
        <Icon name={icon} />
      </div>
      <div className="stat-content">
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </article>
  );
}

export default OrganizerStats;
