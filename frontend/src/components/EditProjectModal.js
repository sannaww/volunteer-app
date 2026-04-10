import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import api from "../api/client";
import { validateContactInfo } from "../utils/contactInfo";
import { PROJECT_TYPE_OPTIONS } from "../utils/presentation";
import { toDateInputValue } from "../utils/formatters";
import { useFeedback } from "./ui/FeedbackProvider";
import Icon from "./ui/Icon";

function EditProjectModal({ project, onClose, onUpdated, onSave, onCancel }) {
  const [form, setForm] = useState({
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
  const [saving, setSaving] = useState(false);

  const { error, success } = useFeedback();
  const handleClose = onClose || onCancel;

  useEffect(() => {
    if (!project) return;

    setForm({
      title: project.title || "",
      description: project.description || "",
      status: project.status || "DRAFT",
      startDate: toDateInputValue(project.startDate),
      endDate: toDateInputValue(project.endDate),
      location: project.location || "",
      projectType: project.projectType || project.type || "",
      volunteersRequired:
        project.volunteersRequired != null ? project.volunteersRequired : project.volunteersNeeded || 1,
      contactInfo: project.contactInfo || "",
    });
  }, [project]);

  useEffect(() => {
    if (!project) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [project]);

  const setField = (name, value) => {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validate = () => {
    if (!form.title.trim()) return "Введите название проекта";
    if (!form.description.trim()) return "Введите описание проекта";

    const volunteersRequired = Number(form.volunteersRequired);
    if (!Number.isFinite(volunteersRequired) || volunteersRequired < 1) {
      return "Количество волонтеров должно быть не меньше 1";
    }

    if (form.startDate && form.endDate && new Date(form.startDate) > new Date(form.endDate)) {
      return "Дата окончания не может быть раньше даты начала";
    }

    if (form.contactInfo.trim()) {
      const contactValidation = validateContactInfo(form.contactInfo);
      if (!contactValidation.ok) return contactValidation.message;
    }

    return null;
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (saving) return;

    const validationError = validate();
    if (validationError) {
      error(validationError, "Проверьте форму");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        status: form.status || undefined,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        location: form.location.trim() || null,
        projectType: form.projectType || null,
        volunteersRequired: Number(form.volunteersRequired),
        contactInfo: form.contactInfo.trim() || null,
      };

      if (onSave) {
        await onSave({
          ...project,
          ...payload,
        });
      } else {
        await api.put(`/api/projects/${project.id}`, payload);
      }

      success("Изменения сохранены.");
      await onUpdated?.();
      handleClose?.();
    } catch (requestError) {
      console.error("Ошибка сохранения проекта:", requestError);
      const message =
        requestError?.response?.data?.details ||
        requestError?.response?.data?.error ||
        requestError?.response?.data?.message ||
        "Не удалось сохранить изменения";
      error(message);
    } finally {
      setSaving(false);
    }
  };

  if (!project) return null;

  const modalMarkup = (
    <div className="modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && handleClose?.()}>
      <div className="modal-content" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Редактирование проекта</h2>
            <p>{project.title}</p>
          </div>
          <button type="button" className="close-btn" onClick={handleClose} disabled={saving} aria-label="Закрыть">
            <Icon name="close" />
          </button>
        </div>

        <form className="project-form-surface" onSubmit={handleSave}>
          <div className="form-group">
            <label htmlFor="edit-project-modal-title">Название проекта</label>
            <input
              id="edit-project-modal-title"
              value={form.title}
              onChange={(event) => setField("title", event.target.value)}
              placeholder="Например: Городской субботник"
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-project-modal-description">Описание</label>
            <textarea
              id="edit-project-modal-description"
              value={form.description}
              onChange={(event) => setField("description", event.target.value)}
              rows="5"
              placeholder="Коротко опишите, что требуется и как будет организована работа."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="edit-project-modal-type">Тип проекта</label>
              <select
                id="edit-project-modal-type"
                value={form.projectType}
                onChange={(event) => setField("projectType", event.target.value)}
              >
                <option value="">Выберите тип</option>
                {PROJECT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="edit-project-modal-volunteers">Требуется волонтеров</label>
              <input
                id="edit-project-modal-volunteers"
                type="number"
                min="1"
                value={form.volunteersRequired}
                onChange={(event) => setField("volunteersRequired", event.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="edit-project-modal-start-date">Дата начала</label>
              <input
                id="edit-project-modal-start-date"
                type="date"
                value={form.startDate}
                onChange={(event) => setField("startDate", event.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="edit-project-modal-end-date">Дата окончания</label>
              <input
                id="edit-project-modal-end-date"
                type="date"
                value={form.endDate}
                onChange={(event) => setField("endDate", event.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="edit-project-modal-location">Локация</label>
              <input
                id="edit-project-modal-location"
                value={form.location}
                onChange={(event) => setField("location", event.target.value)}
                placeholder="Город, адрес или площадка"
              />
            </div>

            <div className="form-group">
              <label htmlFor="edit-project-modal-contact-info">Контакты</label>
              <input
                id="edit-project-modal-contact-info"
                value={form.contactInfo}
                onChange={(event) => setField("contactInfo", event.target.value)}
                placeholder="Email или телефон"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="edit-project-modal-status">Статус</label>
            <select id="edit-project-modal-status" value={form.status} onChange={(event) => setField("status", event.target.value)}>
              <option value="DRAFT">Черновик</option>
              <option value="ACTIVE">Активный</option>
              <option value="COMPLETED">Завершен</option>
              <option value="CANCELLED">Отменен</option>
            </select>
          </div>

          <div className="project-form-actions">
            <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={saving}>
              Отмена
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Сохраняем..." : "Сохранить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalMarkup, document.body);
}

export default EditProjectModal;
