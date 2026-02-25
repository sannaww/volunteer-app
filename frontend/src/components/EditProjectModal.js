import React, { useEffect, useMemo, useState } from "react";
import api from "../api/client";

/**
 * EditProjectModal
 * Модалка редактирования проекта.
 *
 * ✅ ВАЖНО ПРО ТИПЫ:
 * У тебя в БД может быть enum в виде кодов (ECO/SOCIAL/EDU/MED/OTHER) ИЛИ русских строк.
 * Поэтому список option'ов подстраивается под текущий project.type:
 * - если текущий тип похож на код (ECO/SOCIAL/EDU/MED/OTHER) — используем коды
 * - иначе используем русские значения
 *
 * ❌ "Мероприятие" убрано.
 */
function EditProjectModal({ project, onClose, onUpdated }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "",
    volunteersNeeded: 1,
    startDate: "",
    endDate: "",
    location: "",
    contactInfo: "",
  });
  const [saving, setSaving] = useState(false);

  const toDateInput = (v) => {
    if (!v) return "";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  useEffect(() => {
    if (!project) return;
    setForm({
      title: project.title || "",
      description: project.description || "",
      type: project.type || "",
      volunteersNeeded: project.volunteersNeeded ?? 1,
      startDate: toDateInput(project.startDate),
      endDate: toDateInput(project.endDate),
      location: project.location || "",
      contactInfo: project.contactInfo || "",
    });
  }, [project]);

  // блокируем скролл страницы, пока открыта модалка
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const setField = (name, value) => setForm((p) => ({ ...p, [name]: value }));

  const isCodeType = useMemo(() => {
    const t = (project?.type || "").toUpperCase();
    return ["ECO", "SOCIAL", "EDU", "MED", "OTHER"].includes(t);
  }, [project]);

  const typeOptions = useMemo(() => {
    // ❌ EVENT нет
    if (isCodeType) {
      return [
        { value: "", label: "Выберите тип" },
        { value: "ECO", label: "Экология" },
        { value: "SOCIAL", label: "Социальная помощь" },
        { value: "EDU", label: "Образование" },
        { value: "MED", label: "Медицина" },
        { value: "OTHER", label: "Другое" },
      ];
    }
    // русский enum/строки в БД
    return [
      { value: "", label: "Выберите тип" },
      { value: "Экология", label: "Экология" },
      { value: "Социальная помощь", label: "Социальная помощь" },
      { value: "Образование", label: "Образование" },
      { value: "Медицина", label: "Медицина" },
      { value: "Другое", label: "Другое" },
    ];
  }, [isCodeType]);

  // если текущий тип не совпал ни с одним option (например, старое значение) — добавим его,
  // чтобы select был корректным и не ломал сохранение.
  const normalizedTypeOptions = useMemo(() => {
    const values = new Set(typeOptions.map((o) => o.value));
    const current = project?.type || "";
    if (current && !values.has(current)) {
      return [{ value: current, label: `Текущий: ${current}` }, ...typeOptions];
    }
    return typeOptions;
  }, [typeOptions, project]);

  const validate = () => {
    if (!form.title.trim()) return "Введите название проекта";
    if (!form.description.trim()) return "Введите описание проекта";
    if (!form.type) return "Выберите тип проекта";
    const vn = Number(form.volunteersNeeded);
    if (!Number.isFinite(vn) || vn < 1) return "Требуется волонтёров: минимум 1";

    if (form.startDate && form.endDate) {
      const s = new Date(form.startDate);
      const e = new Date(form.endDate);
      if (s > e) return "Дата окончания не может быть раньше даты начала";
    }
    return null;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) return alert(err);

    setSaving(true);
    try {
      // ✅ Даты отправляем YYYY-MM-DD (или null) — безопасно для серверной валидации
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        type: form.type, // важно: значение соответствует enum (кодам или русским строкам)
        volunteersNeeded: Number(form.volunteersNeeded),
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        location: form.location.trim(),
        contactInfo: form.contactInfo.trim(),
      };

      await api.put(`/api/projects/${project.id}`, payload);

      if (onUpdated) await onUpdated();
    } catch (error) {
      console.error("EditProjectModal save error:", error);
      const details = error?.response?.data?.details;
      const msg =
        details ||
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        "Не удалось сохранить изменения";
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const onOverlayMouseDown = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  if (!project) return null;

  return (
    <div
      onMouseDown={onOverlayMouseDown}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "min(900px, 100%)",
          maxHeight: "90vh",
          overflow: "auto",
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
          padding: 18,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>Редактировать проект</div>
          <button type="button" onClick={onClose} disabled={saving}>
            ✖
          </button>
        </div>

        <form onSubmit={handleSave} style={{ display: "grid", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Название проекта *</div>
            <input
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              style={{ width: "100%", padding: 10 }}
              placeholder="Например: Помощь приюту"
            />
          </div>

          <div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Описание *</div>
            <textarea
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              style={{ width: "100%", padding: 10, minHeight: 110 }}
              placeholder="Коротко опишите, что нужно делать"
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Тип проекта *</div>
              <select
                value={form.type}
                onChange={(e) => setField("type", e.target.value)}
                style={{ width: "100%", padding: 10 }}
              >
                {normalizedTypeOptions.map((o) => (
                  <option key={o.value || "__empty"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Требуется волонтёров *</div>
              <input
                type="number"
                min="1"
                value={form.volunteersNeeded}
                onChange={(e) => setField("volunteersNeeded", e.target.value)}
                style={{ width: "100%", padding: 10 }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Дата начала</div>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setField("startDate", e.target.value)}
                style={{ width: "100%", padding: 10 }}
              />
            </div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Дата окончания</div>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setField("endDate", e.target.value)}
                style={{ width: "100%", padding: 10 }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Локация</div>
              <input
                value={form.location}
                onChange={(e) => setField("location", e.target.value)}
                style={{ width: "100%", padding: 10 }}
                placeholder="Город, адрес"
              />
            </div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Контакты</div>
              <input
                value={form.contactInfo}
                onChange={(e) => setField("contactInfo", e.target.value)}
                style={{ width: "100%", padding: 10 }}
                placeholder="email/телефон/ссылка"
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose} disabled={saving}>
              Отмена
            </button>
            <button type="submit" disabled={saving}>
              {saving ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditProjectModal;