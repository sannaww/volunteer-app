import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import api from "../api/client";
import EmptyState from "./ui/EmptyState";
import StatusPill from "./ui/StatusPill";
import { useFeedback } from "./ui/FeedbackProvider";
import { formatDate, formatDateTime } from "../utils/formatters";
import { getApplicationStatusMeta } from "../utils/presentation";
import "./MyApplications.css";

function MyApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { confirm, error, success } = useFeedback();

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const response = await api.get("/api/applications/my");
        setApplications(Array.isArray(response.data) ? response.data : []);
      } catch (requestError) {
        console.error("Ошибка при загрузке заявок:", requestError);
        error(requestError.response?.data?.error || "Не удалось загрузить заявки");
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, [error]);

  const handleCancelApplication = async (applicationId) => {
    const approved = await confirm({
      title: "Отменить заявку?",
      message: "Заявка будет удалена из списка активных откликов.",
      confirmLabel: "Отменить заявку",
      cancelLabel: "Назад",
      tone: "danger",
    });

    if (!approved) return;

    try {
      const response = await api.delete(`/api/applications/${applicationId}`);
      setApplications((prev) => prev.filter((application) => application.id !== applicationId));
      success(response.data.message || "Заявка отменена.");
    } catch (requestError) {
      console.error("Ошибка при отмене заявки:", requestError);
      error(requestError.response?.data?.error || "Не удалось отменить заявку");
    }
  };

  if (loading) {
    return <div className="loading">Загружаем ваши заявки...</div>;
  }

  return (
    <div className="my-applications">
      <div className="page-header">
        <div>
          <h1>Мои заявки</h1>
          <p>Здесь отображаются текущие и завершенные отклики на проекты.</p>
        </div>
      </div>

      {applications.length === 0 ? (
        <EmptyState
          icon="description"
          title="Пока нет заявок"
          description="Перейдите в каталог проектов и выберите инициативу, в которой хотите участвовать."
          action={
            <Link to="/" className="btn btn-primary">
              Открыть каталог проектов
            </Link>
          }
        />
      ) : (
        <div className="applications-list">
          {applications.map((application) => {
            const statusMeta = getApplicationStatusMeta(application.status);
            return (
              <article key={application.id} className="application-card">
                <div className="application-header">
                  <h3>{application.project?.title || "Проект"}</h3>
                  <StatusPill label={statusMeta.label} tone={statusMeta.tone} />
                </div>

                <div className="application-details">
                  <p>
                    <strong>Организатор:</strong>{" "}
                    {application.project?.creator
                      ? `${application.project.creator.firstName} ${application.project.creator.lastName}`
                      : "Не указан"}
                  </p>
                  <p>
                    <strong>Дата проекта:</strong>{" "}
                    {application.project?.startDate ? formatDate(application.project.startDate) : "Не указана"}
                  </p>
                  <p>
                    <strong>Локация:</strong> {application.project?.location || "Не указана"}
                  </p>
                  {application.message ? (
                    <p>
                      <strong>Сообщение:</strong> {application.message}
                    </p>
                  ) : null}
                  <p>
                    <strong>Подана:</strong> {formatDateTime(application.createdAt)}
                  </p>
                </div>

                {application.status === "PENDING" ? (
                  <div className="application-actions">
                    <button className="btn btn-secondary" type="button" onClick={() => handleCancelApplication(application.id)}>
                      Отменить заявку
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

export default MyApplications;
