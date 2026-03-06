import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../api/client";
import { formatDate } from "../utils/formatters";
import EmptyState from "./ui/EmptyState";
import Icon from "./ui/Icon";
import { useFeedback } from "./ui/FeedbackProvider";
import "./DraftProjects.css";

function DraftProjects({ user }) {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const { confirm, error, success } = useFeedback();

  const fetchDrafts = async () => {
    try {
      const response = await api.get("/api/projects?status=DRAFT");
      setDrafts(Array.isArray(response.data) ? response.data : []);
    } catch (requestError) {
      console.error("Ошибка при загрузке черновиков:", requestError);
      error("Не удалось загрузить черновики");
      setDrafts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchDrafts();
  }, [user?.id]);

  const handlePublish = async (projectId) => {
    try {
      await api.put(`/api/projects/${projectId}`, { status: "ACTIVE" });
      success("Черновик отправлен на публикацию.");
      await fetchDrafts();
    } catch (requestError) {
      console.error("Ошибка при публикации проекта:", requestError);
      error("Не удалось отправить проект на публикацию");
    }
  };

  const handleDelete = async (projectId) => {
    const approved = await confirm({
      title: "Удалить черновик?",
      message: "Черновик будет удалён без возможности восстановления.",
      confirmLabel: "Удалить",
      cancelLabel: "Оставить",
      tone: "danger",
    });

    if (!approved) return;

    try {
      await api.delete(`/api/projects/${projectId}`);
      success("Черновик удалён.");
      await fetchDrafts();
    } catch (requestError) {
      console.error("Ошибка при удалении черновика:", requestError);
      error("Не удалось удалить черновик");
    }
  };

  if (!user) {
    return <div className="loading">Загружаем пользователя...</div>;
  }

  if (loading) {
    return <div className="loading">Загружаем черновики...</div>;
  }

  return (
    <div className="draft-projects">
      <div className="drafts-header">
        <div>
          <p className="section-kicker">Организация</p>
          <h2>Черновики</h2>
          <p>Проекты, которые ещё не отправлены на модерацию и видны только вам.</p>
        </div>

        <button className="btn btn-secondary" type="button" onClick={fetchDrafts}>
          <Icon name="refresh" />
          <span>Обновить</span>
        </button>
      </div>

      {drafts.length === 0 ? (
        <EmptyState
          icon="draft"
          title="Черновиков пока нет"
          description="Создайте новый проект или вернитесь позже, когда появятся сохранённые заготовки."
          action={
            <button className="btn btn-primary" type="button" onClick={() => navigate("/create-project")}>
              <Icon name="add_circle" />
              <span>Создать проект</span>
            </button>
          }
        />
      ) : (
        <div className="drafts-list">
          {drafts.map((project) => (
            <article key={project.id} className="draft-card">
              <div className="draft-content">
                <div className="draft-card-top">
                  <h3>{project.title}</h3>
                  <span className="draft-card-badge">Черновик</span>
                </div>

                <p className="draft-description">{project.description}</p>

                <div className="draft-details">
                  <div className="detail-item">
                    <strong>Тип</strong>
                    <span>{project.projectType || "Не указан"}</span>
                  </div>
                  <div className="detail-item">
                    <strong>Локация</strong>
                    <span>{project.location || "Не указана"}</span>
                  </div>
                  <div className="detail-item">
                    <strong>Волонтёры</strong>
                    <span>{project.volunteersRequired || 1}</span>
                  </div>
                  <div className="detail-item">
                    <strong>Создан</strong>
                    <span>{formatDate(project.createdAt)}</span>
                  </div>
                </div>
              </div>

              <div className="draft-actions">
                <button className="btn btn-primary" type="button" onClick={() => handlePublish(project.id)}>
                  <Icon name="publish" />
                  <span>Отправить на публикацию</span>
                </button>
                <button className="btn btn-secondary" type="button" onClick={() => navigate(`/edit-project/${project.id}`)}>
                  <Icon name="edit" />
                  <span>Редактировать</span>
                </button>
                <button className="btn btn-danger" type="button" onClick={() => handleDelete(project.id)}>
                  <Icon name="delete" />
                  <span>Удалить</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default DraftProjects;
