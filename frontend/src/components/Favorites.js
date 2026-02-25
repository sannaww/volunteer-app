import React, { useEffect, useState } from "react";
import { getFavorites, removeFavorite } from "../api/favorites";
import "./ProjectList.css";

function Favorites() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  async function load() {
    try {
      setLoading(true);
      const data = await getFavorites();
      setFavorites(data);
    } catch (e) {
      setMsg(e?.response?.data?.message || "Ошибка загрузки избранного");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onRemove(projectId) {
    try {
      await removeFavorite(projectId);
      setFavorites((prev) => prev.filter((f) => f.projectId !== projectId));
      setMsg("Удалено из избранного");
      setTimeout(() => setMsg(""), 2000);
    } catch (e) {
      setMsg(e?.response?.data?.message || "Ошибка удаления");
      setTimeout(() => setMsg(""), 2500);
    }
  }

  if (loading) return <div className="loading">Загрузка...</div>;

  const getStatusText = (status) => {
  const statusMap = {
    DRAFT: "📝 Черновик",
    ACTIVE: "🟢 Активный",
    COMPLETED: "✅ Завершен",
    CANCELLED: "🔴 Отменен",
  };
  return statusMap[status] || status;
};

const getStatusClass = (status) => {
  return `status-${String(status).toLowerCase()}`;
};
const getProjectTypeLabel = (projectType) => {
  const typeMap = {
    ECOLOGY: "🌱 Экология",
    ANIMAL_WELFARE: "🐾 Защита животных",
    EDUCATION: "📚 Образование",
    SOCIAL: "❤️ Социальная помощь",
    CULTURAL: "🎨 Культура",
    SPORTS: "⚽ Спорт",
    MEDICAL: "🏥 Медицина",
    OTHER: "🔧 Другое",
  };
  return typeMap[projectType] || projectType;
};

  return (
    <div className="project-list">
      <div className="page-header">
        <h1>Избранное</h1>
      </div>

      {msg && (
        <div style={{ marginBottom: 12, padding: 10, border: "1px solid #ddd", borderRadius: 8 }}>
          {msg}
        </div>
      )}

      {favorites.map((f) => (
  <div key={f.id} className="project-card">
    <div className="project-header">
      <div className="project-title-section">
        <h2>{f.project?.title || "Проект"}</h2>

        {f.project?.status && (
  <span className={`project-status ${getStatusClass(f.project.status)}`}>
    {getStatusText(f.project.status)}
  </span>
)}
      </div>

     {f.project?.projectType && (
  <span className="project-type-badge">
    {getProjectTypeLabel(f.project.projectType)}
  </span>
)}

    </div>

    {/* рейтинг проекта */}
    <div style={{ marginTop: 6, opacity: 0.9 }}>
      {f.project?.reviewsCount > 0 ? (
        <span>
          ⭐ {Number(f.project.avgRating).toFixed(1)} ({f.project.reviewsCount})
        </span>
      ) : (
        <span>⭐ Нет оценок</span>
      )}
    </div>

    <p>{f.project?.description || ""}</p>

    <div className="project-meta">
      <div className="meta-item">
        <strong>📅 Дата начала:</strong>
        <span>
          {f.project?.startDate
            ? new Date(f.project.startDate).toLocaleDateString("ru-RU")
            : "Не указана"}
        </span>
      </div>

      <div className="meta-item">
        <strong>📍 Местоположение:</strong>
        <span>{f.project?.location || "Не указано"}</span>
      </div>

      <div className="meta-item">
        <strong>👤 Создатель:</strong>
        <span>
          {f.project?.creator
            ? `${f.project.creator.firstName} ${f.project.creator.lastName}`
            : "—"}
        </span>
      </div>

      <div className="meta-item">
        <strong>📞 Контакты:</strong>
        <span>{f.project?.contactInfo || "Не указаны"}</span>
      </div>
    </div>

    <div className="project-actions">
      <button className="btn btn-danger" onClick={() => onRemove(f.projectId)}>
        🗑 Удалить из избранного
      </button>
    </div>
  </div>
))}

    </div>
  );
}

export default Favorites;
