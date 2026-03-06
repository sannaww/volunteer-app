import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import api from "../api/client";
import EmptyState from "./ui/EmptyState";
import StatusPill from "./ui/StatusPill";
import { useFeedback } from "./ui/FeedbackProvider";
import { formatDateTime } from "../utils/formatters";
import { getApplicationStatusMeta } from "../utils/presentation";
import "./ProjectApplications.css";

function ProjectApplications() {
  const { projectId } = useParams();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { error, success } = useFeedback();

  const fetchApplications = async () => {
    try {
      const response = await api.get(`/api/applications/project/${projectId}`);
      setApplications(Array.isArray(response.data) ? response.data : []);
    } catch (requestError) {
      console.error("Ошибка при загрузке заявок:", requestError);
      error(requestError.response?.data?.error || "Не удалось загрузить заявки");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [projectId]);

  const handleStatusUpdate = async (applicationId, action, successMessage) => {
    try {
      await api.patch(`/api/applications/${applicationId}/${action}`, {});
      success(successMessage);
      await fetchApplications();
    } catch (requestError) {
      error(requestError.response?.data?.error || "Не удалось обновить заявку");
    }
  };

  if (loading) {
    return <div className="loading">Загружаем заявки...</div>;
  }

  return (
    <div className="project-applications">
      <div className="page-header">
        <div>
          <h1>Заявки на проект</h1>
          <p>Просматривайте отклики волонтеров и принимайте решения по участию.</p>
        </div>
      </div>

      {applications.length === 0 ? (
        <EmptyState
          icon="group"
          title="Заявок пока нет"
          description="Когда волонтеры откликнутся, они появятся на этой странице."
        />
      ) : (
        <div className="applications-list">
          {applications.map((application) => {
            const statusMeta = getApplicationStatusMeta(application.status);

            return (
              <article key={application.id} className="application-card">
                <div className="application-header">
                  <h3>
                    {application.user?.firstName} {application.user?.lastName}
                  </h3>
                  <StatusPill label={statusMeta.label} tone={statusMeta.tone} />
                </div>

                <p>
                  <strong>Email:</strong> {application.user?.email || "Не указан"}
                </p>
                {application.message ? (
                  <p>
                    <strong>Сообщение:</strong> {application.message}
                  </p>
                ) : null}
                <p>
                  <strong>Дата отклика:</strong> {formatDateTime(application.createdAt)}
                </p>

                {application.status === "PENDING" ? (
                  <div className="application-actions">
                    <button
                      className="btn btn-success"
                      type="button"
                      onClick={() => handleStatusUpdate(application.id, "approve", "Заявка одобрена.")}
                    >
                      Одобрить
                    </button>
                    <button
                      className="btn btn-danger"
                      type="button"
                      onClick={() => handleStatusUpdate(application.id, "reject", "Заявка отклонена.")}
                    >
                      Отклонить
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ProjectApplications;
