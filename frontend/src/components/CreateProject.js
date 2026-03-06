import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../api/client";
import { validateContactInfo } from "../utils/contactInfo";
import { PROJECT_TYPE_OPTIONS } from "../utils/presentation";
import { useFeedback } from "./ui/FeedbackProvider";
import Icon from "./ui/Icon";
import "./CreateProject.css";

function CreateProject() {
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
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { error, success } = useFeedback();

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleContactInfoChange = (event) => {
    setFormData((prev) => ({
      ...prev,
      contactInfo: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    const contactValidation = validateContactInfo(formData.contactInfo);
    if (!contactValidation.ok) {
      error(contactValidation.message, "Проверьте контакты");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        contactInfo: contactValidation.value,
        volunteersRequired: Number.parseInt(formData.volunteersRequired, 10),
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
      };

      await api.post("/api/projects", payload);
      success("Проект создан и сохранен.", "Готово");
      navigate("/");
    } catch (requestError) {
      console.error("Ошибка при создании проекта:", requestError);
      error(requestError.response?.data?.error || "Не удалось создать проект");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-project">
      <div className="page-header">
        <div>
          <h1>Новый проект</h1>
          <p>Создайте карточку проекта и сохраните ее как черновик или отправьте на публикацию.</p>
        </div>
      </div>

      <form className="project-form-surface" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="project-title">Название проекта</label>
          <input id="project-title" type="text" name="title" value={formData.title} onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label htmlFor="project-description">Описание</label>
          <textarea
            id="project-description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            rows="6"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="project-type">Тип проекта</label>
            <select id="project-type" name="projectType" value={formData.projectType} onChange={handleChange}>
              <option value="">Выберите тип</option>
              {PROJECT_TYPE_OPTIONS.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="project-volunteers">Требуется волонтеров</label>
            <input
              id="project-volunteers"
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
            <label htmlFor="project-start-date">Дата начала</label>
            <input id="project-start-date" type="date" name="startDate" value={formData.startDate} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label htmlFor="project-end-date">Дата окончания</label>
            <input id="project-end-date" type="date" name="endDate" value={formData.endDate} onChange={handleChange} />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="project-location">Локация</label>
          <input
            id="project-location"
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder="Город, адрес или площадка"
          />
        </div>

        <div className="form-group">
          <label htmlFor="project-contact">Контакты для связи</label>
          <input
            id="project-contact"
            type="text"
            name="contactInfo"
            value={formData.contactInfo}
            onChange={handleContactInfoChange}
            placeholder="Email или телефон в формате +79991234567"
            required
          />
          <small>Поддерживаются email и российский номер телефона.</small>
        </div>

        <div className="form-group">
          <label htmlFor="project-status">Режим публикации</label>
          <select id="project-status" name="status" value={formData.status} onChange={handleChange} required>
            <option value="DRAFT">Черновик</option>
            <option value="ACTIVE">Отправить на публикацию</option>
          </select>
          <small>
            {formData.status === "DRAFT"
              ? "Черновик не будет виден пользователям, пока вы не опубликуете его позже."
              : "Для организатора проект пройдет модерацию и станет активным после одобрения."}
          </small>
        </div>

        <div className="project-form-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <Icon name={loading ? "hourglass_top" : "save"} />
            <span>{loading ? "Сохраняем..." : "Сохранить проект"}</span>
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)} disabled={loading}>
            <Icon name="arrow_back" />
            <span>Назад</span>
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateProject;
