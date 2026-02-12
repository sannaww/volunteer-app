import React, { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import "./ProjectHistory.css";

function ProjectHistory({ user, generateCertificate }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL"); // ALL | COMPLETED | CANCELLED

  useEffect(() => {
    if (!user) return;
    fetchHistory();
    // eslint-disable-next-line
  }, [user]);

  const fetchHistory = async () => {
    try {
      // История участия строится по заявкам волонтёра
      const res = await api.get("/api/applications/my");
      setApplications(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error("Ошибка при загрузке истории участия:", e);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  // статус заявки может быть "APPROVED" или "approved" — нормализуем
  const normalizeStatus = (s) => (s ? String(s).toUpperCase() : "");

  // проект может считаться завершённым:
  // 1) по status: COMPLETED/CANCELLED
  // 2) или по endDate < now (если status нет/не используется)
  const projectIsFinished = (project) => {
    if (!project) return false;

    const status = normalizeStatus(project.status);
    if (status === "COMPLETED" || status === "CANCELLED") return true;

    if (project.endDate) {
      const end = new Date(project.endDate).getTime();
      if (!Number.isNaN(end) && end < Date.now()) return true;
    }

    return false;
  };

  const getProjectStatus = (project) => {
    const status = normalizeStatus(project?.status);
    if (status === "CANCELLED") return "CANCELLED";
    // если статус явно completed — ок, иначе если закончился по дате — считаем completed
    if (status === "COMPLETED") return "COMPLETED";
    if (projectIsFinished(project)) return "COMPLETED";
    return "ACTIVE";
  };

  const getStatusText = (status) => {
    const map = {
      COMPLETED: "✅ Завершен",
      CANCELLED: "❌ Отменен",
    };
    return map[status] || status;
  };

  // Берём только те заявки, где участие реально состоялось:
  // approve + проект завершён (по статусу или по дате)
  const participationHistory = useMemo(() => {
    const approved = applications.filter((a) => normalizeStatus(a.status) === "APPROVED");
    const finished = approved.filter((a) => projectIsFinished(a.project));
    return finished;
  }, [applications]);

  const filteredHistory = useMemo(() => {
    if (filter === "ALL") return participationHistory;

    return participationHistory.filter((a) => {
      const pStatus = getProjectStatus(a.project);
      return pStatus === filter;
    });
  }, [participationHistory, filter]);

  if (!user) return null;

  if (loading) return <div className="loading">Загрузка истории...</div>;

  return (
    <div className="project-history">
      <div className="history-filters">
        <button
          className={`filter-btn ${filter === "ALL" ? "active" : ""}`}
          onClick={() => setFilter("ALL")}
          type="button"
        >
          Все
        </button>
        <button
          className={`filter-btn ${filter === "COMPLETED" ? "active" : ""}`}
          onClick={() => setFilter("COMPLETED")}
          type="button"
        >
          Завершенные
        </button>
        <button
          className={`filter-btn ${filter === "CANCELLED" ? "active" : ""}`}
          onClick={() => setFilter("CANCELLED")}
          type="button"
        >
          Отмененные
        </button>
      </div>

      <div className="history-list">
        {filteredHistory.length === 0 ? (
          <div className="empty-state">
            <p>У вас пока нет завершенных проектов</p>
            <p>Подавайте заявки и участвуйте в волонтерской деятельности!</p>
          </div>
        ) : (
          filteredHistory.map((participation) => {
            const project = participation.project;
            const pStatus = getProjectStatus(project);

            return (
              <div key={participation.id} className="history-item">
                <div className="history-content">
                  <h3>{project?.title || "Проект"}</h3>
                  <p>{project?.description || ""}</p>

                  <div className="history-meta">
                    <span className={`status status-${pStatus.toLowerCase()}`}>
                      {getStatusText(pStatus)}
                    </span>

                    <span>
                      Организатор:{" "}
                      {project?.creator
                        ? `${project.creator.firstName} ${project.creator.lastName}`
                        : "—"}
                    </span>

                    <span>
                      Дата участия:{" "}
                      {participation.createdAt
                        ? new Date(participation.createdAt).toLocaleDateString("ru-RU")
                        : "—"}
                    </span>
                  </div>
                </div>

                {typeof generateCertificate === "function" && (
                  <button
                    className="btn btn-primary"
                    onClick={() => generateCertificate(participation)}
                    type="button"
                  >
                    📄 Скачать сертификат
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default ProjectHistory;
