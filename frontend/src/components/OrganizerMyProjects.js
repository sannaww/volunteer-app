import React, { useEffect, useMemo, useState } from "react";

import api from "../api/client";
import EditProjectModal from "./EditProjectModal";
import EmptyState from "./ui/EmptyState";
import Icon from "./ui/Icon";
import StatusPill from "./ui/StatusPill";
import { useFeedback } from "./ui/FeedbackProvider";
import { getProjectStatusMeta } from "../utils/presentation";
import { formatDate } from "../utils/formatters";

function OrganizerMyProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [editingProject, setEditingProject] = useState(null);

  const { confirm, error, success } = useFeedback();

  const fetchMyProjects = async () => {
    setLoading(true);
    try {
      const response = await api.get("/api/projects/organizer", {
        params: {
          status,
          includeDrafts: false,
          search,
        },
      });

      const data = response?.data;
      const list = Array.isArray(data) ? data : data?.projects || [];
      setProjects(list);
    } catch (requestError) {
      console.error("Ошибка при загрузке проектов организатора:", requestError);
      error(
        requestError?.response?.data?.error ||
          requestError?.response?.data?.message ||
          "Не удалось загрузить проекты организатора"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyProjects();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return projects;

    return projects.filter((project) => {
      const haystack = `${project.title || ""} ${project.location || ""} ${project.contactInfo || ""} ${
        project.description || ""
      }`.toLowerCase();
      return haystack.includes(query);
    });
  }, [projects, search]);

  const handleDelete = async (project) => {
    const approved = await confirm({
      title: "Удалить проект?",
      message: `Проект «${project.title}» будет удален без возможности восстановления.`,
      confirmLabel: "Удалить",
      cancelLabel: "Оставить",
      tone: "danger",
    });

    if (!approved) return;

    try {
      await api.delete(`/api/projects/${project.id}`);
      success("Проект удален.");
      await fetchMyProjects();
    } catch (requestError) {
      console.error("Ошибка удаления проекта:", requestError);
      error(requestError?.response?.data?.error || requestError?.response?.data?.message || "Не удалось удалить проект");
    }
  };

  const handleUpdated = async () => {
    setEditingProject(null);
    await fetchMyProjects();
  };

  return (
    <div className="organizer-projects-grid">
      <div className="organizer-projects-toolbar">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Поиск по названию, локации и контактам"
        />

        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="ALL">Все проекты</option>
          <option value="ACTIVE">Активные</option>
          <option value="COMPLETED">Завершенные</option>
          <option value="CANCELLED">Отмененные</option>
        </select>

        <button type="button" className="btn btn-secondary" onClick={fetchMyProjects} disabled={loading}>
          <Icon name="refresh" />
          <span>Обновить</span>
        </button>
      </div>

      {loading ? (
        <div className="loading">Загружаем проекты...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="folder_open"
          title="Проекты не найдены"
          description="Попробуйте изменить фильтр или поисковый запрос."
        />
      ) : (
        <div className="organizer-projects-list">
          {filtered.map((project) => {
            const statusMeta = getProjectStatusMeta(project.status);

            return (
              <article key={project.id} className="project-card organizer-project-card">
                <div className="project-header">
                  <div className="project-title-section">
                    <h2>{project.title}</h2>
                    <StatusPill label={statusMeta.label} tone={statusMeta.tone} />
                  </div>

                  <div className="project-actions project-actions-inline">
                    <button type="button" className="btn btn-secondary" onClick={() => setEditingProject(project)}>
                      <Icon name="edit" />
                      <span>Изменить</span>
                    </button>
                    <button type="button" className="btn btn-danger" onClick={() => handleDelete(project)}>
                      <Icon name="delete" />
                      <span>Удалить</span>
                    </button>
                  </div>
                </div>

                <p>{project.description || "Описание пока не заполнено."}</p>

                <div className="project-meta">
                  <div className="meta-item">
                    <strong>Дата</strong>
                    <span>{project.startDate ? formatDate(project.startDate) : "Не указана"}</span>
                  </div>
                  <div className="meta-item">
                    <strong>Локация</strong>
                    <span>{project.location || "Не указана"}</span>
                  </div>
                  <div className="meta-item meta-item-wide meta-item-contacts">
                    <strong>Контакты</strong>
                    <span>{project.contactInfo || "Не указаны"}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {editingProject ? (
        <EditProjectModal
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onUpdated={handleUpdated}
        />
      ) : null}
    </div>
  );
}

export default OrganizerMyProjects;
