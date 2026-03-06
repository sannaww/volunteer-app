export function normalizeRole(role) {
  return role ? String(role).trim().toLowerCase() : "";
}

export function formatDate(value, locale = "ru-RU") {
  if (!value) return "Не указано";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Не указано";
  return date.toLocaleDateString(locale);
}

export function formatDateTime(value, locale = "ru-RU") {
  if (!value) return "Не указано";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Не указано";
  return date.toLocaleString(locale);
}

export function formatTime(value, locale = "ru-RU") {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatPhoneDisplay(phone) {
  if (!phone) return "Не указано";

  const cleaned = String(phone).replace(/\D/g, "");
  if (cleaned.length === 11 && (cleaned.startsWith("7") || cleaned.startsWith("8"))) {
    const match = cleaned.match(/^[78]?(\d{3})(\d{3})(\d{2})(\d{2})$/);
    if (match) {
      return `+7 (${match[1]}) ${match[2]}-${match[3]}-${match[4]}`;
    }
  }

  return phone;
}

export function formatPersonName(person, fallback = "Пользователь") {
  if (!person) return fallback;
  const fullName = `${person.firstName || ""} ${person.lastName || ""}`.trim();
  if (fullName) return fullName;
  if (person.email) return person.email;
  if (person.id != null) return `${fallback} #${person.id}`;
  return fallback;
}

export function truncateText(text, limit = 32) {
  const value = String(text || "");
  if (value.length <= limit) return value;
  return `${value.slice(0, limit).trimEnd()}...`;
}

export function toDateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
}
