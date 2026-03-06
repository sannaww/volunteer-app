import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import api from "../api/client";
import { useFeedback } from "./ui/FeedbackProvider";
import { PROJECT_TYPE_OPTIONS } from "../utils/presentation";
import { toDateInputValue } from "../utils/formatters";
import "./CreateProject.css";

function EditProject() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { error, success } = useFeedback();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "DRAFT",
    startDate: "",
    endDate: "",
    location: "",
    projectType: "",
    volunteersRequired: 1,
    contactInfo: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await api.get(`/api/projects/${id}`);
        const project = response.data;
        setFormData({
          title: project.title || "",
          description: project.description || "",
          status: project.status || "DRAFT",
          startDate: toDateInputValue(project.startDate),
          endDate: toDateInputValue(project.endDate),
          location: project.location || "",
          projectType: project.projectType || "",
          volunteersRequired: project.volunteersRequired || 1,
          contactInfo: project.contactInfo || "",
        });
      } catch (requestError) {
        console.error("Ошибка при загрузке проекта:", requestError);
        error("Не удалось загрузить проект");
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [error, id]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    try {
      await api.put(`/api/projects/${id}`, {
        ...formData,
        volunteersRequired: Number.parseInt(formData.volunteersRequired, 10),
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
      });

      success("Проект обновлен.");
      navigate("/profile");
    } catch (requestError) {
      console.error("Ошибка при обновлении проекта:", requestError);
      error(requestError.response?.data?.error || "Не удалось обновить проект");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">Загружаем проект...</div>;
  }

  return (
    <div className="create-project">
      <div className="page-header">
        <div>
          <h1>Редактирование проекта</h1>
          <p>Измените параметры проекта без изменения маршрутов и сценариев работы.</p>
        </div>
      </div>

      <form className="project-form-surface" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="edit-title">Название проекта</label>
          <input id="edit-title" type="text" name="title" value={formData.title} onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label htmlFor="edit-description">Описание</label>
          <textarea
            id="edit-description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            rows="6"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="edit-project-type">Тип проекта</label>
            <select id="edit-project-type" name="projectType" value={formData.projectType} onChange={handleChange}>
              <option value="">Выберите тип</option>
              {PROJECT_TYPE_OPTIONS.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="edit-volunteers">Требуется волонтеров</label>
            <input
              id="edit-volunteers"
              type="number"
              name="volunteersRequired"
              value={formData.volunteersRequired}
              onChange={handleChange}
              min="1"
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="edit-start-date">Дата начала</label>
            <input id="edit-start-date" type="date" name="startDate" value={formData.startDate} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label htmlFor="edit-end-date">Дата окончания</label>
            <input id="edit-end-date" type="date" name="endDate" value={formData.endDate} onChange={handleChange} />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="edit-location">Локация</label>
          <input id="edit-location" type="text" name="location" value={formData.location} onChange={handleChange} />
        </div>

        <div className="form-group">
          <label htmlFor="edit-contact-info">Контакты</label>
          <input id="edit-contact-info" type="text" name="contactInfo" value={formData.contactInfo} onChange={handleChange} />
        </div>

        <div className="form-group">
          <label htmlFor="edit-status">Статус</label>
          <select id="edit-status" name="status" value={formData.status} onChange={handleChange} required>
            <option value="DRAFT">Черновик</option>
            <option value="ACTIVE">Активный</option>
            <option value="COMPLETED">Завершен</option>
            <option value="CANCELLED">Отменен</option>
          </select>
        </div>

        <div className="project-form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Сохраняем..." : "Сохранить изменения"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate("/profile")} disabled={saving}>
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
}

export default EditProject;
