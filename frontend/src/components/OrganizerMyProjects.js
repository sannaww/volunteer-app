import React, { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import EditProjectModal from "./EditProjectModal";
/**
 * OrganizerMyProjects
 * - показывает проекты организатора (без черновиков)
 * - фильтр по статусу применяется кнопкой "Применить"
 * - редактирование через модалку (без перехода на страницу)
 */
function OrganizerMyProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);

  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");

  const [editingProject, setEditingProject] = useState(null);

  const fetchMyProjects = async () => {
    setLoading(true);
    try {
      const resp = await api.get("/api/projects/organizer", {
        params: {
          status,
          includeDrafts: false, // ✅ черновики только во вкладке "Черновики"
          search,
        },
      });

      const data = resp?.data;
      const list = Array.isArray(data) ? data : data?.projects || [];
      setProjects(list);
    } catch (e) {
      console.error("Ошибка при загрузке проектов организатора:", e);
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        (e?.response?.status ? `HTTP ${e.response.status}` : "") ||
        "Не удалось загрузить проекты организатора";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (project) => {
  const ok = window.confirm(
    `Удалить проект "${project.title}"?\n\nЭто действие нельзя отменить.`
  );
  if (!ok) return;

  try {
    await api.delete(`/api/projects/${project.id}`);
    await fetchMyProjects(); // обновляем список
  } catch (e) {
    console.error("Ошибка удаления проекта:", e);
    alert(
      e?.response?.data?.error ||
        e?.response?.data?.message ||
        "Не удалось удалить проект"
    );
  }
};

  useEffect(() => {
    fetchMyProjects();
  }, []);

  const statusRu = (s) => {
    switch ((s || "").toUpperCase()) {
      case "ACTIVE":
        return "Активный";
      case "COMPLETED":
        return "Завершён";
      case "CANCELLED":
        return "Отменён";
      default:
        return s || "—";
    }
  };

  const statusBadgeStyle = (s) => {
    const base = {
      display: "inline-flex",
      alignItems: "center",
      padding: "4px 10px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 700,
      border: "1px solid rgba(0,0,0,0.08)",
      background: "rgba(0,0,0,0.06)",
    };
    const up = (s || "").toUpperCase();
    if (up === "ACTIVE") return { ...base, background: "rgba(46, 204, 113, 0.12)" };
    if (up === "COMPLETED") return { ...base, background: "rgba(52, 152, 219, 0.12)" };
    if (up === "CANCELLED") return { ...base, background: "rgba(231, 76, 60, 0.12)" };
    return base;
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;

    return projects.filter((p) => {
      const title = (p.title || "").toLowerCase();
      const location = (p.location || "").toLowerCase();
      const contactInfo = (p.contactInfo || "").toLowerCase();
      const description = (p.description || "").toLowerCase();
      return (
        title.includes(q) ||
        location.includes(q) ||
        contactInfo.includes(q) ||
        description.includes(q)
      );
    });
  }, [projects, search]);

  const handleUpdated = async () => {
    setEditingProject(null);
    await fetchMyProjects();
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск: название/локация/контакты"
          style={{ padding: 8, minWidth: 260 }}
        />

        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ padding: 8 }}>
          <option value="ALL">Все</option>
          <option value="ACTIVE">Активные</option>
          <option value="COMPLETED">Завершенные</option>
          <option value="CANCELLED">Отмененные</option>
        </select>

        <button type="button" onClick={fetchMyProjects} disabled={loading}>
          ✅ Применить
        </button>
      </div>

      {loading ? (
        <div className="loading">Загрузка проектов...</div>
      ) : filtered.length === 0 ? (
        <div>Проекты не найдены.</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {filtered.map((p) => (
            <div
              key={p.id}
              style={{
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: 12,
                padding: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 800, marginBottom: 2 }}>{p.title}</div>
                    <span style={statusBadgeStyle(p.status)}>{statusRu(p.status)}</span>
                  </div>

                  <div style={{ fontSize: 14, opacity: 0.85 }}>
                    {p.startDate ? `📅 ${new Date(p.startDate).toLocaleDateString("ru-RU")}` : ""}
                    {p.endDate ? ` — ${new Date(p.endDate).toLocaleDateString("ru-RU")}` : ""}
                    {p.location ? ` • 📍 ${p.location}` : ""}
                  </div>

                  {p.contactInfo && (
                    <div style={{ fontSize: 14, marginTop: 2 }}>☎️ {p.contactInfo}</div>
                  )}
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <button type="button" onClick={() => setEditingProject(p)}>
                    ✏️ Редактировать
                  </button>

                  <button type="button" onClick={() => handleDelete(p)}>
                    🗑️ Удалить
                    </button>
                </div>
              </div>

              {p.description && (
                <div style={{ marginTop: 8, fontSize: 14, opacity: 0.9 }}>{p.description}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {editingProject && (
        <EditProjectModal project={editingProject} onClose={() => setEditingProject(null)} onUpdated={handleUpdated} />
      )}
    </div>
  );
}

export default OrganizerMyProjects;