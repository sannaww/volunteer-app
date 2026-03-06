const TOKEN_KEY = "token";
const USER_KEY = "user";
const PREFILL_LOGIN_EMAIL_KEY = "prefillLoginEmail";
const PROFILE_ACTIVE_TAB_PREFIX = "profileActiveTab:";
const SELECTED_ORGANIZER_KEY = "selectedOrganizer";

function getStorage() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
}

export function getSessionToken() {
  return getStorage()?.getItem(TOKEN_KEY) || "";
}

export function setSessionToken(token) {
  const storage = getStorage();
  if (!storage) return;

  if (token) {
    storage.setItem(TOKEN_KEY, token);
    return;
  }

  storage.removeItem(TOKEN_KEY);
}

export function getSessionUser() {
  const raw = getStorage()?.getItem(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setSessionUser(user) {
  const storage = getStorage();
  if (!storage) return;

  if (user) {
    storage.setItem(USER_KEY, JSON.stringify(user));
    return;
  }

  storage.removeItem(USER_KEY);
}

export function clearSession() {
  const storage = getStorage();
  if (!storage) return;

  storage.removeItem(TOKEN_KEY);
  storage.removeItem(USER_KEY);
}

export function setPrefillLoginEmail(email) {
  const storage = getStorage();
  if (!storage) return;

  if (email) {
    storage.setItem(PREFILL_LOGIN_EMAIL_KEY, email);
    return;
  }

  storage.removeItem(PREFILL_LOGIN_EMAIL_KEY);
}

export function consumePrefillLoginEmail() {
  const storage = getStorage();
  if (!storage) return "";

  const email = storage.getItem(PREFILL_LOGIN_EMAIL_KEY) || "";
  storage.removeItem(PREFILL_LOGIN_EMAIL_KEY);
  return email;
}

export function getProfileActiveTab(role) {
  if (!role) return "";
  return getStorage()?.getItem(`${PROFILE_ACTIVE_TAB_PREFIX}${role}`) || "";
}

export function setProfileActiveTab(role, tab) {
  const storage = getStorage();
  if (!storage || !role || !tab) return;
  storage.setItem(`${PROFILE_ACTIVE_TAB_PREFIX}${role}`, tab);
}

export function setSelectedOrganizer(organizer) {
  const storage = getStorage();
  if (!storage) return;

  if (organizer) {
    storage.setItem(SELECTED_ORGANIZER_KEY, JSON.stringify(organizer));
    return;
  }

  storage.removeItem(SELECTED_ORGANIZER_KEY);
}

export function consumeSelectedOrganizer() {
  const storage = getStorage();
  if (!storage) return null;

  const raw = storage.getItem(SELECTED_ORGANIZER_KEY);
  storage.removeItem(SELECTED_ORGANIZER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
