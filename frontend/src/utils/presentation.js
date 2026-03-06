import { normalizeRole } from "./formatters";

export const PROJECT_TYPE_OPTIONS = [
  { value: "ECOLOGY", label: "Экология" },
  { value: "ANIMAL_WELFARE", label: "Защита животных" },
  { value: "EDUCATION", label: "Образование" },
  { value: "SOCIAL", label: "Социальная помощь" },
  { value: "CULTURAL", label: "Культура" },
  { value: "SPORTS", label: "Спорт" },
  { value: "MEDICAL", label: "Медицина" },
  { value: "OTHER", label: "Другое" },
];

export const PROJECT_STATUS_META = {
  DRAFT: { label: "Черновик", tone: "draft" },
  ACTIVE: { label: "Активный", tone: "active" },
  COMPLETED: { label: "Завершен", tone: "completed" },
  CANCELLED: { label: "Отменен", tone: "cancelled" },
};

export const APPLICATION_STATUS_META = {
  PENDING: { label: "На рассмотрении", tone: "pending" },
  APPROVED: { label: "Одобрена", tone: "approved" },
  REJECTED: { label: "Отклонена", tone: "rejected" },
};

export const ROLE_META = {
  volunteer: { label: "Волонтер" },
  organizer: { label: "Организатор" },
  admin: { label: "Администратор" },
};

export function getProjectTypeLabel(type) {
  const match = PROJECT_TYPE_OPTIONS.find((option) => option.value === type);
  return match?.label || type || "Без категории";
}

export function getProjectStatusMeta(status) {
  return PROJECT_STATUS_META[String(status || "").toUpperCase()] || {
    label: status || "Неизвестно",
    tone: "neutral",
  };
}

export function getApplicationStatusMeta(status) {
  return APPLICATION_STATUS_META[String(status || "").toUpperCase()] || {
    label: status || "Неизвестно",
    tone: "neutral",
  };
}

export function getRoleLabel(role) {
  const normalized = normalizeRole(role);
  return ROLE_META[normalized]?.label || role || "Пользователь";
}
