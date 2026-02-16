export function isValidEmail(input) {
  const v = String(input || "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

export function normalizePhoneRu(input) {
  const digits = String(input || "").replace(/\D/g, "");

  // допускаем 10 цифр (без кода) -> +7
  if (digits.length === 10) return "+7" + digits;

  // 8XXXXXXXXXX -> +7XXXXXXXXXX
  if (digits.length === 11 && digits.startsWith("8")) return "+7" + digits.slice(1);

  // 7XXXXXXXXXX -> +7XXXXXXXXXX
  if (digits.length === 11 && digits.startsWith("7")) return "+7" + digits.slice(1);

  // если другое — невалидно
  return null;
}

export function validateContactInfo(input) {
  const v = String(input || "").trim();
  if (!v) return { ok: false, message: "Укажите email или телефон" };

  // email
  if (v.includes("@")) {
    if (!isValidEmail(v)) return { ok: false, message: "Некорректный email" };
    if (v.length > 60) return { ok: false, message: "Слишком длинный email" };
    return { ok: true, type: "email", value: v };
  }

  // phone
  const phone = normalizePhoneRu(v);
  if (!phone) return { ok: false, message: "Телефон должен быть формата +7XXXXXXXXXX (11 цифр)" };
  return { ok: true, type: "phone", value: phone };
}
