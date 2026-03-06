import React, { useEffect, useMemo, useState } from "react";

import api from "../api/client";
import { formatDate, formatPersonName } from "../utils/formatters";
import { getProjectStatusMeta } from "../utils/presentation";
import EmptyState from "./ui/EmptyState";
import Icon from "./ui/Icon";
import StatusPill from "./ui/StatusPill";
import "./ProjectHistory.css";

function ProjectHistory({ user, generateCertificate }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get("/api/applications/my");
        setApplications(Array.isArray(response.data) ? response.data : []);
      } catch (requestError) {
        console.error("Ошибка загрузки истории участия:", requestError);
        setApplications([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user?.id]);

  const normalizeStatus = (value) => String(value || "").toUpperCase();

  const getProjectLifecycleStatus = (project) => {
    const status = normalizeStatus(project?.status);

    if (status === "CANCELLED") return "CANCELLED";
    if (status === "COMPLETED") return "COMPLETED";

    if (project?.endDate) {
      const endDate = new Date(project.endDate);
      if (!Number.isNaN(endDate.getTime()) && endDate.getTime() < Date.now()) {
        return "COMPLETED";
      }
    }

    return "ACTIVE";
  };

  const participationHistory = useMemo(() => {
    return applications.filter((application) => {
      const approved = normalizeStatus(application.status) === "APPROVED";
      const lifecycleStatus = getProjectLifecycleStatus(application.project);
      return approved && lifecycleStatus !== "ACTIVE";
    });
  }, [applications]);

  const filteredHistory = useMemo(() => {
    if (filter === "ALL") return participationHistory;

    return participationHistory.filter(
      (application) => getProjectLifecycleStatus(application.project) === filter
    );
  }, [filter, participationHistory]);

  if (!user) return null;

  if (loading) {
    return <div className="loading">Загружаем историю участия...</div>;
  }

  return (
    <div className="project-history">
      <div className="history-filters">
        <button
          type="button"
          className={`filter-btn ${filter === "ALL" ? "active" : ""}`}
          onClick={() => setFilter("ALL")}
        >
          Все
        </button>
        <button
          type="button"
          className={`filter-btn ${filter === "COMPLETED" ? "active" : ""}`}
          onClick={() => setFilter("COMPLETED")}
        >
          Завершённые
        </button>
        <button
          type="button"
          className={`filter-btn ${filter === "CANCELLED" ? "active" : ""}`}
          onClick={() => setFilter("CANCELLED")}
        >
          Отменённые
        </button>
      </div>

      {filteredHistory.length === 0 ? (
        <EmptyState
          icon="history"
          title="История участия пока пуста"
          description="После завершения подтверждённых проектов здесь появятся ваши участия и сертификаты."
        />
      ) : (
        <div className="history-list">
          {filteredHistory.map((participation) => {
            const project = participation.project || {};
            const statusMeta = getProjectStatusMeta(getProjectLifecycleStatus(project));

            return (
              <article key={participation.id} className="history-item">
                <div className="history-content">
                  <div className="history-head">
                    <h3>{project.title || "Проект"}</h3>
                    <StatusPill label={statusMeta.label} tone={statusMeta.tone} />
                  </div>

                  <p>{project.description || "Описание отсутствует."}</p>

                  <div className="history-meta">
                    <span>
                      <strong>Организатор:</strong> {formatPersonName(project.creator, "Организатор")}
                    </span>
                    <span>
                      <strong>Дата участия:</strong> {formatDate(participation.createdAt)}
                    </span>
                    <span>
                      <strong>Дата проекта:</strong> {formatDate(project.startDate)}
                    </span>
                  </div>
                </div>

                {typeof generateCertificate === "function" ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => generateCertificate(participation)}
                  >
                    <Icon name="download" />
                    <span>Скачать сертификат</span>
                  </button>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ProjectHistory;
