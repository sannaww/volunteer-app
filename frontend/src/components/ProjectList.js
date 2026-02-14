import React, { useState, useEffect } from 'react';
import api from '../api/client';
import ProjectFilters from './ProjectFilters';
import './ProjectList.css';

import { getFavorites, addFavorite, removeFavorite } from "../api/favorites";
import { getReviews, createReview } from "../api/reviews";
import { canReview } from "../api/canReview";


function ProjectList({ user }) {
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    search: '',
    projectType: '',
    location: '',
    dateFrom: '',
    dateTo: ''
  });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);

  const [editingProject, setEditingProject] = useState(null);

  // Favorites
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [toast, setToast] = useState("");

  // Reviews modal
  const [reviewModalProject, setReviewModalProject] = useState(null); // store whole project object
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewMsg, setReviewMsg] = useState("");

  const [reviewAllowed, setReviewAllowed] = useState(null); // null / true / false
  const [reviewChecking, setReviewChecking] = useState(false);

  // Reviews list modal
const [reviewsModalProject, setReviewsModalProject] = useState(null);
const [reviewsList, setReviewsList] = useState([]);
const [reviewsLoading, setReviewsLoading] = useState(false);
const [reviewsError, setReviewsError] = useState("");

  // --- Helpers ---
  const showToast = (text) => {
    setToast(text);
    setTimeout(() => setToast(""), 2000);
  };

  const loadFavorites = async () => {
    try {
      const favs = await getFavorites();
      setFavoriteIds(new Set(favs.map(f => f.projectId)));
    } catch (e) {
      console.error("Ошибка загрузки избранного:", e);
    }
  };

  const toggleFavorite = async (projectId) => {
    if (!user) {
      alert("Нужно войти в систему");
      return;
    }

    try {
      const isFav = favoriteIds.has(projectId);

      if (isFav) {
        await removeFavorite(projectId);
        setFavoriteIds(prev => {
          const next = new Set(prev);
          next.delete(projectId);
          return next;
        });
        showToast("Удалено из избранного");
      } else {
        await addFavorite(projectId);
        setFavoriteIds(prev => {
          const next = new Set(prev);
          next.add(projectId);
          return next;
        });
        showToast("Добавлено в избранное");
      }
    } catch (e) {
      alert(e?.response?.data?.message || "Ошибка при работе с избранным");
    }
  };

  const fetchProjects = async (currentFilters = filters) => {
    try {
      setLoading(true);

      // Создаем параметры запроса
      const params = new URLSearchParams();
      if (currentFilters.search) params.append('search', currentFilters.search);
      if (currentFilters.projectType) params.append('projectType', currentFilters.projectType);
      if (currentFilters.location) params.append('location', currentFilters.location);
      if (currentFilters.dateFrom) params.append('dateFrom', currentFilters.dateFrom);
      if (currentFilters.dateTo) params.append('dateTo', currentFilters.dateTo);
      if (currentFilters.status) params.append('status', currentFilters.status);

      console.log('Параметры запроса:', params.toString()); // Для отладки

      const response = await api.get(`/api/projects?${params.toString()}`);
      setProjects(response.data);
      setFilteredProjects(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Ошибка при загрузке проектов:', error);
      setLoading(false);
    }
  };

  // Initial load + reload favorites when user changes (login/logout)
  useEffect(() => {
    fetchProjects();

    if (user && user.role === "volunteer") {
      loadFavorites();
    } else {
      // если разлогинились — чистим избранное, чтобы UI не путал
      setFavoriteIds(new Set());
    }
  }, [user?.id, user?.role]);

  // Close review modal by ESC
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") closeReviewModal();
    };

    if (reviewModalProject) {
      window.addEventListener("keydown", onKeyDown);
    }
    return () => window.removeEventListener("keydown", onKeyDown);

  }, [reviewModalProject]);

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    fetchProjects(newFilters);
  };

  const handleResetFilters = () => {
    const resetFilters = {
      search: '',
      projectType: '',
      location: '',
      dateFrom: '',
      dateTo: ''
    };
    setFilters(resetFilters);
    fetchProjects(resetFilters);
  };

  const handleApply = async (projectId) => {
    if (!user) {
      alert('Для подачи заявки необходимо войти в систему');
      return;
    }

    try {
      const message = prompt('Напишите сообщение организатору (необязательно):');

      await api.post(`/api/applications/${projectId}`, {
        message: message || ''
      });

      alert('Заявка успешно подана!');
      fetchProjects();
    } catch (error) {
      alert(error.response?.data?.error || 'Ошибка при подаче заявки');
    }
  };

  const handleEdit = (project) => {
    setEditingProject(project);
  };

  const handleSaveEdit = async (updatedProject) => {
    try {
      // Подготавливаем данные для отправки
      const dataToSend = {
        title: updatedProject.title,
        description: updatedProject.description,
        status: updatedProject.status,
        startDate: updatedProject.startDate || null,
        endDate: updatedProject.endDate || null,
        location: updatedProject.location || '',
        projectType: updatedProject.projectType || '',
        volunteersRequired: updatedProject.volunteersRequired || 1,
        contactInfo: updatedProject.contactInfo || ''
      };

      console.log('Отправляемые данные:', dataToSend); // Для отладки

      const response = await api.put(
        `/api/projects/${updatedProject.id}`,
        dataToSend
      );

      setEditingProject(null);

      // Обновляем проект в состоянии
      setProjects(projects.map(project =>
        project.id === updatedProject.id ? response.data : project
      ));
      setFilteredProjects(filteredProjects.map(project =>
        project.id === updatedProject.id ? response.data : project
      ));

      alert('Проект успешно обновлен!');
    } catch (error) {
      console.error('Ошибка при обновлении проекта:', error);
      alert(error.response?.data?.error || 'Ошибка при обновлении проекта');
    }
  };

  const handleDeleteClick = (project) => {
    setProjectToDelete(project);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await api.delete(`/api/projects/${projectToDelete.id}`);

      setShowDeleteModal(false);
      setProjectToDelete(null);

      fetchProjects(); // Обновляем список проектов
      alert('Проект успешно удален!');
    } catch (error) {
      alert(error.response?.data?.error || 'Ошибка при удалении проекта');
    }
  };

  const getProjectTypeLabel = (projectType) => {
    const typeMap = {
      'ECOLOGY': '🌱 Экология',
      'ANIMAL_WELFARE': '🐾 Защита животных',
      'EDUCATION': '📚 Образование',
      'SOCIAL': '❤️Социальная помощь',
      'CULTURAL': '🎨 Культура',
      'SPORTS': '⚽ Спорт',
      'MEDICAL': '🏥 Медицина',
      'OTHER': '🔧 Другое'
    };
    return typeMap[projectType] || projectType;
  };

  // Функция для отображения статуса
  const getStatusText = (status) => {
    const statusMap = {
      'DRAFT': '📝 Черновик',
      'ACTIVE': '🟢 Активный',
      'COMPLETED': '✅ Завершен',
      'CANCELLED': '🔴 Отменен'
    };
    return statusMap[status] || status;
  };

  const getStatusClass = (status) => {
    return `status-${String(status).toLowerCase()}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Не указана';
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const formatPhoneDisplay = (phone) => {
    if (!phone) return 'Не указано';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && (cleaned.startsWith('7') || cleaned.startsWith('8'))) {
      const match = cleaned.match(/^[78]?(\d{3})(\d{3})(\d{2})(\d{2})$/);
      if (match) {
        return `+7 (${match[1]}) ${match[2]}-${match[3]}-${match[4]}`;
      }
    }
    return phone;
  };

  const handleMessageOrganizer = (project) => {
    if (!user) {
      alert('Для отправки сообщений необходимо войти в систему');
      return;
    }

    if (!project.creator?.id) {
      alert('Не удалось определить организатора проекта');
      return;
    }

    const organizerInfo = {
      id: project.creator.id,
      firstName: project.creator.firstName,
      lastName: project.creator.lastName,
      role: project.creator.role || 'organizer'
    };

    localStorage.setItem('selectedOrganizer', JSON.stringify(organizerInfo));
    window.location.href = '/chat';
  };

  // --- Reviews modal controls ---
 const openReviewModal = async (project) => {
  setReviewModalProject(project);
  setReviewRating(5);
  setReviewText("");
  setReviewMsg("");
  setReviewAllowed(null);
  setReviewChecking(true);

  try {
    const data = await canReview(project.id);
    setReviewAllowed(!!data.canReview);
  } catch (e) {
    setReviewAllowed(false);
    setReviewMsg("Не удалось проверить право на отзыв");
  } finally {
    setReviewChecking(false);
  }
};

  const closeReviewModal = () => {
    setReviewModalProject(null);
    setReviewMsg("");
  };

  const openReviewsModal = async (project) => {
  setReviewsModalProject(project);
  setReviewsError("");
  setReviewsLoading(true);

  try {
    const data = await getReviews(project.id);
    setReviewsList(data);
  } catch (e) {
    setReviewsError(e?.response?.data?.message || "Ошибка загрузки отзывов");
  } finally {
    setReviewsLoading(false);
  }
};

const closeReviewsModal = () => {
  setReviewsModalProject(null);
  setReviewsList([]);
  setReviewsError("");
};

  const submitReview = async () => {
    try {
      setReviewMsg("");
      if (!reviewModalProject) return;

      if (!reviewRating || Number(reviewRating) < 1 || Number(reviewRating) > 5) {
        setReviewMsg("Оценка должна быть от 1 до 5");
        return;
      }

      if (reviewText.trim().length < 5) {
        setReviewMsg("Текст отзыва слишком короткий (минимум 5 символов)");
        return;
      }

      await createReview(reviewModalProject.id, {
        rating: Number(reviewRating),
        text: reviewText.trim(),
      });

      setReviewMsg("✅ Отзыв отправлен!");
      await fetchProjects();

      setTimeout(() => {
        closeReviewModal();
      }, 800);
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        "Ошибка отправки отзыва";
      setReviewMsg(msg);
    }
  };

  if (loading) {
    return <div className="loading">Загрузка проектов...</div>;
  }

  return (
    <div className="project-list">
      <div className="page-header">
        <h1>Волонтерские проекты</h1>
        <button
          className="btn btn-primary"
          onClick={() => fetchProjects()}
          disabled={loading}
        >
          🔄 Обновить
        </button>
      </div>

      <ProjectFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onReset={handleResetFilters}
      />

      <div className="projects-stats">
        Найдено проектов: {filteredProjects.length}
      </div>

      {toast && (
        <div style={{ margin: "10px 0", padding: 10, border: "1px solid #ddd", borderRadius: 8 }}>
          {toast}
        </div>
      )}

      <div className="projects-grid">
        {filteredProjects.map(project => (
          <div key={project.id} className="project-card">
            <div className="project-header">
              <div className="project-title-section">
                <h2>{project.title}</h2>
                <span className={`project-status ${getStatusClass(project.status)}`}>
                  {getStatusText(project.status)}
                </span>
              </div>

              {project.projectType && (
                <span className="project-type-badge">
                  {getProjectTypeLabel(project.projectType)}
                </span>
              )}
            </div>

            {/* Rating display */}
            <div style={{ marginTop: 6, opacity: 0.9 }}>
              {project.reviewsCount > 0 ? (
                <span>⭐ {Number(project.avgRating).toFixed(1)} ({project.reviewsCount})</span>
              ) : (
                <span>⭐ Нет оценок</span>
              )}
            </div>

            <p>{project.description}</p>

            <div className="project-meta">
              <div className="meta-item">
                <strong>📅 Дата начала:</strong>
                <span>{formatDate(project.startDate)}</span>
              </div>
              <div className="meta-item">
                <strong>📍 Местоположение:</strong>
                <span>{project.location || 'Не указано'}</span>
              </div>
              <div className="meta-item">
                <strong>👤 Создатель:</strong>
                <span>{project.creator.firstName} {project.creator.lastName}</span>
              </div>
              <div className="meta-item">
                <strong>👥 Требуется волонтеров:</strong>
                <span>{project.volunteersRequired}</span>
              </div>
              <div className="meta-item">
                <strong>📞 Контакты:</strong>
                <span>
                  {project.contactInfo ?
                    (project.contactInfo.includes('@')
                      ? project.contactInfo
                      : formatPhoneDisplay(project.contactInfo)
                    )
                    : 'Не указаны'
                  }
                </span>
              </div>
              <div className="meta-item">
                <strong>📊 Заявки:</strong>
                <span>
                  Всего: {project.applicationsCount}
                  {project.pendingApplicationsCount > 0 &&
                    `, Новые: ${project.pendingApplicationsCount}`
                  }
                </span>
              </div>
            </div>

            <div className="project-actions">
              {user && user.role === 'volunteer' && project.status !== "CANCELLED" && (
                <>
                  {project.status === 'ACTIVE' ? (
                    <>
                      {/* Favorite */}
                      <button
                        className="btn"
                        onClick={() => toggleFavorite(project.id)}
                        style={{
                          border: "1px solid #ccc",
                          background: "white",
                          fontSize: 18
                        }}
                        title="В избранное"
                      >
                        {favoriteIds.has(project.id) ? "❤️" : "🤍"}
                      </button>

                      {/* Apply */}
                      <button
                        className="btn btn-primary"
                        onClick={() => handleApply(project.id)}
                      >
                        📝 Подать заявку
                      </button>

                      {/* Message organizer */}
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleMessageOrganizer(project)}
                      >
                        💬 Написать организатору
                      </button>
                    </>
                  ) : (
                    <div className="project-not-available">
                      {project.status === 'COMPLETED'
                        ? '✅ Проект завершен'
                        : '❌ Проект отменен'}
                      <br />
                      <small>Заявки не принимаются</small>
                    </div>
                  )}

                  {/* Review button (can be shown for any status, you can restrict if you want) */}
                  
                  <button className="btn" onClick={() => openReviewModal(project)}>
                    📝 Оставить отзыв
                  </button>
                </>
              )}
<button className="btn" onClick={() => openReviewsModal(project)}>
  📖 Отзывы
</button>

              {user && user.id === project.createdBy && (
                <>
                  <button
                    className="btn btn-warning"
                    onClick={() => handleEdit(project)}
                  >
                    ✏️Редактировать
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleDeleteClick(project)}
                  >
                    🗑️Удалить
                  </button>
                </>
              )}

              {user && user.id === project.createdBy && (
                <button
                  className="btn btn-success"
                  onClick={() => window.location.href = `/project-applications/${project.id}`}
                >
                  👥 Управление заявками
                  {project.pendingApplicationsCount > 0 &&
                    ` (${project.pendingApplicationsCount} новых)`
                  }
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className="empty-state">
          <h3>Проекты не найдены</h3>
          <p>Попробуйте изменить параметры поиска или сбросить фильтры</p>
          <button
            className="btn btn-primary"
            onClick={handleResetFilters}
          >
            Сбросить фильтры
          </button>
        </div>
      )}

      {/* ✅ Reviews modal rendered ONCE (outside map) */}
      {reviewModalProject && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
          onMouseDown={(e) => {
            // close only when clicking on the overlay (not on select dropdown etc.)
            if (e.target === e.currentTarget) closeReviewModal();
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 12,
              padding: 18,
              width: "min(520px, 95vw)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>Отзыв о проекте</h3>
            <div style={{ marginBottom: 10, fontWeight: 600 }}>
              {reviewModalProject.title}
            </div>

            {reviewChecking ? (
            <div>Проверяем возможность оставить отзыв...</div>
          ) : reviewAllowed === false ? (
            
            <div style={{ color: "crimson", marginTop: 10 }}>
              Оставить отзыв можно только после одобрения заявки (APPROVED).
              <div style={{ marginTop: 12, textAlign: "right" }}>
                <button className="btn" onClick={closeReviewModal}>Закрыть</button>
              </div>
            </div>
          ) : (
            <>
            
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", marginBottom: 6 }}>Оценка:</label>
        <select
          value={reviewRating}
          onChange={(e) => setReviewRating(e.target.value)}
          style={{ padding: 8, width: 120 }}
        >
          <option value={1}>1</option>
          <option value={2}>2</option>
          <option value={3}>3</option>
          <option value={4}>4</option>
          <option value={5}>5</option>
        </select>
      </div>

    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", marginBottom: 6 }}>Комментарий:</label>
      <textarea
        value={reviewText}
        onChange={(e) => setReviewText(e.target.value)}
        rows={4}
        style={{ width: "100%", padding: 10, borderRadius: 8 }}
        placeholder="Например: всё было организовано отлично..."
      />
    </div>

    {reviewMsg && (
      <div style={{ marginBottom: 12, color: reviewMsg.startsWith("✅") ? "green" : "crimson" }}>
        {reviewMsg}
      </div>
    )}

    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
      <button className="btn btn-primary" onClick={submitReview}>
        Отправить
      </button>
      <button className="btn" onClick={closeReviewModal}>
        Отмена
      </button>
    </div>
  </>
)}

            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
              Подсказка: нажми Esc, чтобы закрыть окно.
            </div>
          </div>
        </div>
      )}

{reviewsModalProject && (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      padding: 16,
    }}
    onMouseDown={(e) => {
      if (e.target === e.currentTarget) closeReviewsModal();
    }}
  >
    <div
      style={{
        background: "white",
        borderRadius: 12,
        padding: 18,
        width: "min(720px, 95vw)",
        maxHeight: "85vh",
        overflow: "auto",
        boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <h3 style={{ marginTop: 0 }}>Отзывы</h3>
      <div style={{ marginBottom: 12, fontWeight: 600 }}>
        {reviewsModalProject.title}
      </div>

      {reviewsLoading ? (
        <div>Загрузка отзывов...</div>
      ) : reviewsError ? (
        <div style={{ color: "crimson" }}>{reviewsError}</div>
      ) : reviewsList.length === 0 ? (
        <div>Пока нет отзывов.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {reviewsList.map((r) => (
            <div
              key={r.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 10,
                padding: 12,
              }}
            >
              <div style={{ fontWeight: 700 }}>⭐ {r.rating}</div>

              {r.text ? (
                <div style={{ marginTop: 6 }}>{r.text}</div>
              ) : (
                <div style={{ marginTop: 6, opacity: 0.7 }}>Без текста</div>
              )}

              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
                {new Date(r.createdAt).toLocaleString("ru-RU")}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 14, textAlign: "right" }}>
        <button className="btn" onClick={closeReviewsModal}>
          Закрыть
        </button>
      </div>
    </div>
  </div>
)}

      {/* Модальное окно подтверждения удаления */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Подтверждение удаления</h2>
              <button
                className="close-btn"
                onClick={() => setShowDeleteModal(false)}
              >
                ×
              </button>
            </div>
            <p>Вы уверены, что хотите удалить проект "{projectToDelete?.title}"?</p>
            <p>Это действие нельзя отменить.</p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button
                className="btn btn-danger"
                onClick={handleDeleteConfirm}
              >
                Да, удалить
              </button>
              <button
                className="btn"
                onClick={() => setShowDeleteModal(false)}
                style={{ backgroundColor: '#6c757d', color: 'white' }}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно редактирования */}
      {editingProject && (
        <EditProjectModal
          project={editingProject}
          onSave={handleSaveEdit}
          onCancel={() => setEditingProject(null)}
        />
      )}
    </div>
  );
}

// Компонент модального окна редактирования - ИСПРАВЛЕННАЯ ВЕРСИЯ
function EditProjectModal({ project, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    title: project.title,
    description: project.description,
    status: project.status,
    startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
    endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '',
    location: project.location || '',
    projectType: project.projectType || '',
    volunteersRequired: project.volunteersRequired || 1,
    contactInfo: project.contactInfo || ''
  });

  const projectTypes = [
    { value: 'ECOLOGY', label: '🌱 Экология' },
    { value: 'ANIMAL_WELFARE', label: '🐾 Защита животных' },
    { value: 'EDUCATION', label: '📚 Образование' },
    { value: 'SOCIAL', label: '❤️Социальная помощь' },
    { value: 'CULTURAL', label: '🎨 Культура' },
    { value: 'SPORTS', label: '⚽ Спорт' },
    { value: 'MEDICAL', label: '🏥 Медицина' },
    { value: 'OTHER', label: '🔧 Другое' }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Данные формы перед отправкой:', formData); // Отладочная информация
    onSave({
      ...project,
      ...formData,
      volunteersRequired: parseInt(formData.volunteersRequired, 10)
    });
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Редактировать проект</h2>
          <button className="close-btn" onClick={onCancel}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Название проекта:</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
            />
          </div>

          <div className="form-group">
            <label>Описание:</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows="5"
              style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Тип проекта:</label>
              <select
                name="projectType"
                value={formData.projectType}
                onChange={handleChange}
                style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
              >
                <option value="">Выберите тип</option>
                {projectTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Требуется волонтеров:</label>
              <input
                type="number"
                name="volunteersRequired"
                value={formData.volunteersRequired}
                onChange={handleChange}
                min="1"
                style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Дата начала:</label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
              />
            </div>

            <div className="form-group">
              <label>Дата окончания:</label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Местоположение:</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="Город или адрес..."
              style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
            />
          </div>

          <div className="form-group">
            <label>Контактная информация:</label>
            <input
              type="text"
              name="contactInfo"
              value={formData.contactInfo}
              onChange={handleChange}
              placeholder="Email или телефон..."
              style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
            />
          </div>

          <div className="form-group">
            <label>Статус:</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
            >
              <option value="DRAFT">Черновик</option>
              <option value="ACTIVE">Активный</option>
              <option value="COMPLETED">Завершен</option>
              <option value="CANCELLED">Отменен</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button type="submit" className="btn btn-primary">
              Сохранить
            </button>
            <button
              type="button"
              className="btn"
              onClick={onCancel}
              style={{ backgroundColor: '#6c757d', color: 'white' }}
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProjectList;