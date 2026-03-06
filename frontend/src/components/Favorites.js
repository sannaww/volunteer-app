import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getFavorites, removeFavorite } from "../api/favorites";
import { formatDate, formatPersonName, formatPhoneDisplay } from "../utils/formatters";
import { getProjectStatusMeta, getProjectTypeLabel } from "../utils/presentation";
import EmptyState from "./ui/EmptyState";
import Icon from "./ui/Icon";
import StatusPill from "./ui/StatusPill";
import { useFeedback } from "./ui/FeedbackProvider";
import "./ProjectList.css";

function Favorites() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const { error, success } = useFeedback();

  const loadFavorites = async () => {
    try {
      setLoading(true);
      const data = await getFavorites();
      setFavorites(Array.isArray(data) ? data : []);
    } catch (requestError) {
      console.error("Ошибка загрузки избранного:", requestError);
      setFavorites([]);
      error(requestError?.response?.data?.message || "Не удалось загрузить избранное");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  const handleRemove = async (projectId) => {
    try {
      await removeFavorite(projectId);
      setFavorites((prev) => prev.filter((item) => item.projectId !== projectId));
      success("Проект удалён из избранного.");
    } catch (requestError) {
      console.error("Ошибка удаления из избранного:", requestError);
      error(requestError?.response?.data?.message || "Не удалось удалить проект из избранного");
    }
  };

  if (loading) {
    return <div className="loading">Загружаем избранное...</div>;
  }

  return (
    <div className="project-list">
      <div className="page-header">
        <div>
          <h1>Избранные проекты</h1>
          <p>Список инициатив, которые вы сохранили для быстрого возврата.</p>
        </div>
        <button className="btn btn-secondary" type="button" onClick={loadFavorites}>
          <Icon name="refresh" />
          <span>Обновить</span>
        </button>
      </div>

      {favorites.length === 0 ? (
        <EmptyState
          icon="favorite"
          title="Избранное пока пусто"
          description="Сохраняйте интересные проекты, чтобы быстро вернуться к ним позже."
          action={
            <button className="btn btn-primary" type="button" onClick={() => navigate("/")}>
              <Icon name="explore" />
              <span>Перейти к проектам</span>
            </button>
          }
        />
      ) : (
        <div className="projects-grid">
          {favorites.map((favorite) => {
            const project = favorite.project || {};
            const statusMeta = getProjectStatusMeta(project.status);

            return (
              <article key={favorite.id} className="project-card">
                <div className="project-header">
                  <div className="project-title-section">
                    <h2>{project.title || "Проект"}</h2>
                    <StatusPill label={statusMeta.label} tone={statusMeta.tone} />
                  </div>
                  {project.projectType ? (
                    <span className="project-type-badge">{getProjectTypeLabel(project.projectType)}</span>
                  ) : null}
                </div>

                <div className="project-rating">
                  {project.reviewsCount > 0 ? (
                    <span>
                      Рейтинг: {Number(project.avgRating).toFixed(1)} из 5 ({project.reviewsCount})
                    </span>
                  ) : (
                    <span>Пока нет оценок</span>
                  )}
                </div>

                <p>{project.description || "Описание отсутствует."}</p>

                <div className="project-meta">
                  <div className="meta-item">
                    <strong>Дата</strong>
                    <span>{formatDate(project.startDate)}</span>
                  </div>
                  <div className="meta-item">
                    <strong>Локация</strong>
                    <span>{project.location || "Не указана"}</span>
                  </div>
                  <div className="meta-item">
                    <strong>Организатор</strong>
                    <span>{formatPersonName(project.creator, "Организатор")}</span>
                  </div>
                  <div className="meta-item">
                    <strong>Контакты</strong>
                    <span>
                      {project.contactInfo
                        ? project.contactInfo.includes("@")
                          ? project.contactInfo
                          : formatPhoneDisplay(project.contactInfo)
                        : "Не указаны"}
                    </span>
                  </div>
                </div>

                <div className="project-actions">
                  <button className="btn btn-secondary" type="button" onClick={() => navigate("/")}>
                    <Icon name="visibility" />
                    <span>Каталог проектов</span>
                  </button>
                  <button
                    className="btn btn-danger"
                    type="button"
                    onClick={() => handleRemove(favorite.projectId)}
                  >
                    <Icon name="favorite" />
                    <span>Убрать из избранного</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Favorites;
