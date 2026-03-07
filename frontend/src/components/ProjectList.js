import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../api/client";
import { addFavorite, getFavorites, removeFavorite } from "../api/favorites";
import { canReview } from "../api/canReview";
import { createReview, getReviews } from "../api/reviews";
import { setSelectedOrganizer } from "../utils/authSession";
import { formatDate, formatDateTime, formatPersonName, formatPhoneDisplay } from "../utils/formatters";
import { getProjectStatusMeta, getProjectTypeLabel } from "../utils/presentation";
import EditProjectModal from "./EditProjectModal";
import ProjectFilters from "./ProjectFilters";
import EmptyState from "./ui/EmptyState";
import Icon from "./ui/Icon";
import StatusPill from "./ui/StatusPill";
import { useFeedback } from "./ui/FeedbackProvider";
import "./ProjectList.css";

function ProjectList({ user }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: "",
    projectType: "",
    location: "",
    dateFrom: "",
    dateTo: "",
    status: "",
  });
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [editingProject, setEditingProject] = useState(null);

  const [reviewModalProject, setReviewModalProject] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewMsg, setReviewMsg] = useState("");
  const [reviewAllowed, setReviewAllowed] = useState(null);
  const [reviewChecking, setReviewChecking] = useState(false);

  const [reviewsModalProject, setReviewsModalProject] = useState(null);
  const [reviewsList, setReviewsList] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState("");
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [editRating, setEditRating] = useState(5);
  const [editText, setEditText] = useState("");

  const navigate = useNavigate();
  const { confirm, error, prompt, success } = useFeedback();

  const canManageProject = (project) => {
    if (!user) return false;
    if (user.role === "admin") return true;
    return String(user.id) === String(project.createdBy ?? project.creator?.id);
  };

  const fetchProjects = async (currentFilters = filters) => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (currentFilters.search) params.append("search", currentFilters.search);
      if (currentFilters.projectType) params.append("projectType", currentFilters.projectType);
      if (currentFilters.location) params.append("location", currentFilters.location);
      if (currentFilters.dateFrom) params.append("dateFrom", currentFilters.dateFrom);
      if (currentFilters.dateTo) params.append("dateTo", currentFilters.dateTo);
      if (currentFilters.status) params.append("status", currentFilters.status);

      const response = await api.get(`/api/projects?${params.toString()}`);
      setProjects(Array.isArray(response.data) ? response.data : []);
    } catch (requestError) {
      console.error("Ошибка при загрузке проектов:", requestError);
      error("Не удалось загрузить список проектов");
    } finally {
      setLoading(false);
    }
  };

  const loadFavorites = async () => {
    if (!user || user.role !== "volunteer") {
      setFavoriteIds(new Set());
      return;
    }

    try {
      const favorites = await getFavorites();
      setFavoriteIds(new Set(favorites.map((favorite) => favorite.projectId)));
    } catch (requestError) {
      console.error("Ошибка загрузки избранного:", requestError);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    loadFavorites();
  }, [user?.id, user?.role]);

  useEffect(() => {
    if (!reviewModalProject) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") setReviewModalProject(null);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [reviewModalProject]);

  const handleFiltersChange = (nextFilters) => {
    setFilters(nextFilters);
    fetchProjects(nextFilters);
  };

  const handleResetFilters = () => {
    const nextFilters = {
      search: "",
      projectType: "",
      location: "",
      dateFrom: "",
      dateTo: "",
      status: "",
    };
    setFilters(nextFilters);
    fetchProjects(nextFilters);
  };

  const toggleFavorite = async (projectId) => {
    if (!user) {
      error("Войдите в систему, чтобы пользоваться избранным.");
      return;
    }

    try {
      const isFavorite = favoriteIds.has(projectId);

      if (isFavorite) {
        await removeFavorite(projectId);
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(projectId);
          return next;
        });
        success("Проект удален из избранного.");
      } else {
        await addFavorite(projectId);
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.add(projectId);
          return next;
        });
        success("Проект добавлен в избранное.");
      }
    } catch (requestError) {
      error(requestError?.response?.data?.message || "Не удалось обновить избранное");
    }
  };

  const handleApply = async (projectId) => {
    if (!user) {
      error("Для подачи заявки необходимо войти в систему.");
      return;
    }

    const message = await prompt({
      title: "Комментарий к заявке",
      message: "При желании добавьте короткое сообщение для организатора.",
      confirmLabel: "Отправить заявку",
      cancelLabel: "Отмена",
      placeholder: "Например: могу участвовать по выходным",
    });

    if (message === null) return;

    try {
      await api.post(`/api/applications/${projectId}`, {
        message: message || "",
      });

      success("Заявка отправлена.");
      await fetchProjects();
    } catch (requestError) {
      error(requestError.response?.data?.error || "Не удалось отправить заявку");
    }
  };

  const handleSaveEdit = async (updatedProject) => {
    try {
      const payload = {
        title: updatedProject.title,
        description: updatedProject.description,
        status: updatedProject.status,
        startDate: updatedProject.startDate || null,
        endDate: updatedProject.endDate || null,
        location: updatedProject.location || "",
        projectType: updatedProject.projectType || "",
        volunteersRequired: updatedProject.volunteersRequired || 1,
        contactInfo: updatedProject.contactInfo || "",
      };

      const response = await api.put(`/api/projects/${updatedProject.id}`, payload);

      setProjects((prev) =>
        prev.map((project) => (project.id === updatedProject.id ? response.data : project))
      );
      setEditingProject(null);
      success("Проект обновлен.");
    } catch (requestError) {
      console.error("Ошибка при обновлении проекта:", requestError);
      error(requestError.response?.data?.error || "Не удалось обновить проект");
      throw requestError;
    }
  };

  const handleDeleteProject = async (project) => {
    const approved = await confirm({
      title: "Удалить проект?",
      message: `Проект «${project.title}» будет удален без возможности восстановления.`,
      confirmLabel: "Удалить проект",
      cancelLabel: "Оставить",
      tone: "danger",
    });

    if (!approved) return;

    try {
      await api.delete(`/api/projects/${project.id}`);
      success("Проект удален.");
      await fetchProjects();
    } catch (requestError) {
      error(requestError.response?.data?.error || "Не удалось удалить проект");
    }
  };

  const handleMessageOrganizer = (project) => {
    if (!user) {
      error("Для сообщений требуется авторизация.");
      return;
    }

    if (!project.creator?.id) {
      error("Не удалось определить организатора проекта.");
      return;
    }

    setSelectedOrganizer({
      id: project.creator.id,
      firstName: project.creator.firstName,
      lastName: project.creator.lastName,
      role: project.creator.role || "organizer",
    });
    navigate("/chat");
  };

  const openReviewModal = async (project) => {
    setReviewModalProject(project);
    setReviewRating(5);
    setReviewText("");
    setReviewMsg("");
    setReviewAllowed(null);
    setReviewChecking(true);

    try {
      const data = await canReview(project.id);
      setReviewAllowed(Boolean(data.canReview));
    } catch (requestError) {
      setReviewAllowed(false);
      setReviewMsg("Не удалось проверить право на отзыв.");
    } finally {
      setReviewChecking(false);
    }
  };

  const openReviewsModal = async (project) => {
    setReviewsModalProject(project);
    setReviewsError("");
    setReviewsLoading(true);

    try {
      const data = await getReviews(project.id);
      setReviewsList(Array.isArray(data) ? data : []);
    } catch (requestError) {
      setReviewsError(requestError?.response?.data?.message || "Не удалось загрузить отзывы.");
    } finally {
      setReviewsLoading(false);
    }
  };

  const startEditReview = (review) => {
    setEditingReviewId(review.id);
    setEditRating(review.rating);
    setEditText(review.text || "");
  };

  const cancelEditReview = () => {
    setEditingReviewId(null);
    setEditRating(5);
    setEditText("");
  };

  const saveEditReview = async (reviewId) => {
    try {
      await api.put(`/api/projects/reviews/${reviewId}`, {
        rating: Number(editRating),
        text: editText.trim(),
      });

      const data = await getReviews(reviewsModalProject.id);
      setReviewsList(Array.isArray(data) ? data : []);
      cancelEditReview();
      success("Отзыв обновлен.");
    } catch (requestError) {
      error(requestError?.response?.data?.message || requestError?.response?.data?.error || "Не удалось обновить отзыв");
    }
  };

  const deleteMyReview = async (reviewId) => {
    const approved = await confirm({
      title: "Удалить отзыв?",
      message: "Отзыв будет удален без возможности восстановления.",
      confirmLabel: "Удалить",
      cancelLabel: "Оставить",
      tone: "danger",
    });

    if (!approved) return;

    try {
      await api.delete(`/api/projects/reviews/${reviewId}`);
      const data = await getReviews(reviewsModalProject.id);
      setReviewsList(Array.isArray(data) ? data : []);
      await fetchProjects();
      if (editingReviewId === reviewId) cancelEditReview();
      success("Отзыв удален.");
    } catch (requestError) {
      error(requestError?.response?.data?.message || requestError?.response?.data?.error || "Не удалось удалить отзыв");
    }
  };

  const submitReview = async () => {
    if (!reviewModalProject) return;

    if (!reviewRating || Number(reviewRating) < 1 || Number(reviewRating) > 5) {
      setReviewMsg("Оценка должна быть от 1 до 5");
      return;
    }

    if (reviewText.trim().length < 5) {
      setReviewMsg("Комментарий должен содержать минимум 5 символов.");
      return;
    }

    try {
      await createReview(reviewModalProject.id, {
        rating: Number(reviewRating),
        text: reviewText.trim(),
      });

      setReviewMsg("Отзыв отправлен.");
      await fetchProjects();
      window.setTimeout(() => setReviewModalProject(null), 800);
    } catch (requestError) {
      const message =
        requestError?.response?.data?.message ||
        requestError?.response?.data?.error ||
        "Не удалось отправить отзыв";
      setReviewMsg(message);
    }
  };

  const projectCards = useMemo(
    () =>
      projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          user={user}
          favoriteIds={favoriteIds}
          canManageProject={canManageProject(project)}
          onToggleFavorite={toggleFavorite}
          onApply={handleApply}
          onEdit={() => setEditingProject(project)}
          onDelete={() => handleDeleteProject(project)}
          onMessage={() => handleMessageOrganizer(project)}
          onManageApplications={() => navigate(`/project-applications/${project.id}`)}
          onOpenReview={() => openReviewModal(project)}
          onOpenReviews={() => openReviewsModal(project)}
        />
      )),
    [projects, user, favoriteIds]
  );

  if (loading) {
    return <div className="loading">Загружаем проекты...</div>;
  }

  return (
    <div className="project-list">
      <div className="page-header">
        <div>
          <h1>Волонтерские проекты</h1>
          <p>Подберите подходящую инициативу, отслеживайте активные наборы и связывайтесь с организаторами.</p>
        </div>
        <button className="btn btn-primary" type="button" onClick={() => fetchProjects()} disabled={loading}>
          <Icon name="refresh" />
          <span>Обновить</span>
        </button>
      </div>

      <ProjectFilters filters={filters} onFiltersChange={handleFiltersChange} onReset={handleResetFilters} />

      <div className="projects-stats">Найдено проектов: {projects.length}</div>

      {projects.length === 0 ? (
        <EmptyState
          icon="search_off"
          title="Проекты не найдены"
          description="Попробуйте изменить фильтры или сбросить параметры поиска."
          action={
            <button className="btn btn-primary" type="button" onClick={handleResetFilters}>
              Сбросить фильтры
            </button>
          }
        />
      ) : (
        <div className="projects-grid">{projectCards}</div>
      )}

      <ReviewComposerDialog
        open={Boolean(reviewModalProject)}
        project={reviewModalProject}
        reviewRating={reviewRating}
        setReviewRating={setReviewRating}
        reviewText={reviewText}
        setReviewText={setReviewText}
        reviewMsg={reviewMsg}
        reviewAllowed={reviewAllowed}
        reviewChecking={reviewChecking}
        onClose={() => setReviewModalProject(null)}
        onSubmit={submitReview}
      />

      <ReviewsDialog
        open={Boolean(reviewsModalProject)}
        project={reviewsModalProject}
        user={user}
        reviewsList={reviewsList}
        reviewsLoading={reviewsLoading}
        reviewsError={reviewsError}
        editingReviewId={editingReviewId}
        editRating={editRating}
        setEditRating={setEditRating}
        editText={editText}
        setEditText={setEditText}
        onClose={() => {
          setReviewsModalProject(null);
          setReviewsList([]);
          setReviewsError("");
          cancelEditReview();
        }}
        onStartEdit={startEditReview}
        onCancelEdit={cancelEditReview}
        onSaveEdit={saveEditReview}
        onDeleteReview={deleteMyReview}
      />

      {editingProject ? (
        <EditProjectModal
          project={editingProject}
          onSave={handleSaveEdit}
          onCancel={() => setEditingProject(null)}
        />
      ) : null}
    </div>
  );
}

function ProjectCard({
  project,
  user,
  favoriteIds,
  canManageProject,
  onToggleFavorite,
  onApply,
  onEdit,
  onDelete,
  onMessage,
  onManageApplications,
  onOpenReview,
  onOpenReviews,
}) {
  const statusMeta = getProjectStatusMeta(project.status);

  return (
    <article className="project-card">
      <div className="project-header">
        <div className="project-title-section">
          <h2>{project.title}</h2>
          <StatusPill label={statusMeta.label} tone={statusMeta.tone} />
        </div>

        <div className="project-header-right">
          {project.projectType ? <span className="project-type-badge">{getProjectTypeLabel(project.projectType)}</span> : null}
          {user?.role === "volunteer" && project.status !== "CANCELLED" ? (
            <button
              className={`favorite-top-btn ${favoriteIds.has(project.id) ? "active" : ""}`}
              type="button"
              onClick={() => onToggleFavorite(project.id)}
              title={favoriteIds.has(project.id) ? "Убрать из избранного" : "Добавить в избранное"}
            >
              <Icon name={favoriteIds.has(project.id) ? "favorite" : "favorite_border"} />
            </button>
          ) : null}
        </div>
      </div>

      <div className="project-rating">
        {project.reviewsCount > 0 ? (
          <span>Рейтинг: {Number(project.avgRating).toFixed(1)} из 5 ({project.reviewsCount})</span>
        ) : (
          <span>Пока нет оценок</span>
        )}
      </div>

      <p>{project.description}</p>

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
          <strong>Волонтеры</strong>
          <span>{project.volunteersRequired || 1}</span>
        </div>
        <div className="meta-item meta-item-wide meta-item-contacts">
          <strong>Контакты</strong>
          <span>
            {project.contactInfo
              ? project.contactInfo.includes("@")
                ? project.contactInfo
                : formatPhoneDisplay(project.contactInfo)
              : "Не указаны"}
          </span>
        </div>
        <div className="meta-item meta-item-wide">
          <strong>Заявки</strong>
          <span>
            Всего: {project.applicationsCount}
            {project.pendingApplicationsCount > 0 ? `, новые: ${project.pendingApplicationsCount}` : ""}
          </span>
        </div>
      </div>

      <div className="project-actions project-card-actions">
        {user?.role === "volunteer" && project.status !== "CANCELLED" ? (
          <>
            {project.status === "ACTIVE" ? (
              <>
                <button className="btn btn-primary" type="button" onClick={() => onApply(project.id)}>
                  <Icon name="description" />
                  <span>Подать заявку</span>
                </button>
                <button className="btn btn-secondary project-message-btn" type="button" onClick={onMessage}>
                  <Icon name="comment" className="project-message-icon" />
                  <span>Написать организатору</span>
                </button>
              </>
            ) : (
              <div className="project-not-available">
                {project.status === "COMPLETED" ? "Проект завершен" : "Проект недоступен"}
              </div>
            )}

            <button className="btn btn-secondary" type="button" onClick={onOpenReview}>
              <Icon name="rate_review" />
              <span>Оставить отзыв</span>
            </button>
          </>
        ) : null}

        <button className="btn btn-secondary" type="button" onClick={onOpenReviews}>
          <Icon name="reviews" />
          <span>Отзывы</span>
        </button>

        {canManageProject ? (
          <>
            <button className="btn btn-warning" type="button" onClick={onEdit}>
              <Icon name="edit" />
              <span>Редактировать</span>
            </button>
            <button className="btn btn-danger" type="button" onClick={onDelete}>
              <Icon name="delete" />
              <span>Удалить</span>
            </button>
            <button className="btn btn-success" type="button" onClick={onManageApplications}>
              <Icon name="groups" />
              <span>
                Заявки
                {project.pendingApplicationsCount > 0 ? ` (${project.pendingApplicationsCount})` : ""}
              </span>
            </button>
          </>
        ) : null}
      </div>
    </article>
  );
}

function ReviewComposerDialog({
  open,
  project,
  reviewRating,
  setReviewRating,
  reviewText,
  setReviewText,
  reviewMsg,
  reviewAllowed,
  reviewChecking,
  onClose,
  onSubmit,
}) {
  if (!open || !project) return null;

  return (
    <div className="modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal-content" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Отзыв о проекте</h2>
            <p>{project.title}</p>
          </div>
          <button className="close-btn" type="button" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>

        {reviewChecking ? (
          <div className="loading">Проверяем возможность оставить отзыв...</div>
        ) : reviewAllowed === false ? (
          <div className="error">
            Оставить отзыв можно только после одобрения вашей заявки на участие.
          </div>
        ) : (
          <div className="review-dialog-body">
            <div className="form-group">
              <label htmlFor="review-rating">Оценка</label>
              <select id="review-rating" value={reviewRating} onChange={(event) => setReviewRating(event.target.value)}>
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
                <option value={5}>5</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="review-text">Комментарий</label>
              <textarea
                id="review-text"
                value={reviewText}
                onChange={(event) => setReviewText(event.target.value)}
                rows={5}
                placeholder="Напишите коротко, как прошел ваш опыт участия."
              />
            </div>

            {reviewMsg ? (
              <div className={reviewMsg === "Отзыв отправлен." ? "project-inline-success" : "error"}>{reviewMsg}</div>
            ) : null}

            <div className="project-form-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Отмена
              </button>
              <button type="button" className="btn btn-primary" onClick={onSubmit}>
                Отправить
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewsDialog({
  open,
  project,
  user,
  reviewsList,
  reviewsLoading,
  reviewsError,
  editingReviewId,
  editRating,
  setEditRating,
  editText,
  setEditText,
  onClose,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDeleteReview,
}) {
  if (!open || !project) return null;

  return (
    <div className="modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal-content project-reviews-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Отзывы</h2>
            <p>{project.title}</p>
          </div>
          <button className="close-btn" type="button" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>

        {reviewsLoading ? (
          <div className="loading">Загружаем отзывы...</div>
        ) : reviewsError ? (
          <div className="error">{reviewsError}</div>
        ) : reviewsList.length === 0 ? (
          <EmptyState icon="reviews" title="Отзывов пока нет" description="Станьте первым, кто поделится впечатлениями." />
        ) : (
          <div className="project-reviews-list">
            {reviewsList.map((review) => (
              <div key={review.id} className="project-review-item">
                <div className="project-review-head">
                  <strong>{review.authorName || "Пользователь"}</strong>
                  <span>Оценка: {review.rating}/5</span>
                </div>

                {editingReviewId === review.id ? (
                  <div className="project-review-editor">
                    <select value={editRating} onChange={(event) => setEditRating(event.target.value)}>
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                      <option value={3}>3</option>
                      <option value={4}>4</option>
                      <option value={5}>5</option>
                    </select>
                    <textarea value={editText} onChange={(event) => setEditText(event.target.value)} rows={4} />
                    <div className="project-form-actions">
                      <button className="btn btn-secondary" type="button" onClick={onCancelEdit}>
                        Отмена
                      </button>
                      <button className="btn btn-primary" type="button" onClick={() => onSaveEdit(review.id)}>
                        Сохранить
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p>{review.text || "Автор не добавил комментарий."}</p>
                    <div className="project-review-footer">
                      <span>{formatDateTime(review.createdAt)}</span>
                      {user && String(review.authorId) === String(user.id) ? (
                        <div className="project-actions project-actions-inline">
                          <button className="btn btn-secondary" type="button" onClick={() => onStartEdit(review)}>
                            Изменить
                          </button>
                          <button className="btn btn-danger" type="button" onClick={() => onDeleteReview(review.id)}>
                            Удалить
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProjectList;
