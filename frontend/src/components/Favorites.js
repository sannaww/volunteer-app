import React, { useEffect, useState } from "react";
import { getFavorites, removeFavorite } from "../api/favorites";

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

      {favorites.length === 0 ? (
        <p>Пока нет избранных проектов.</p>
      ) : (
        <div className="projects-grid">
          {favorites.map((f) => (
            <div key={f.id} className="project-card">
              <div className="project-header">
                <div className="project-title-section">
                  <h2>{f.project?.title || "Проект"}</h2>
                </div>
              </div>

              <p>{f.project?.description || ""}</p>

              <div className="project-actions">
                <button className="btn btn-danger" onClick={() => onRemove(f.projectId)}>
                  🗑 Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Favorites;
