import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Profile.css";

import OrganizerStats from "./OrganizerStats";
import DraftProjects from "./DraftProjects";
import ProjectHistory from "./ProjectHistory";
import AdminDashboard from "./AdminDashboard";

function Profile({ user, onUserUpdate }) {
  const [activeTab, setActiveTab] = useState("profile");

  const [profile, setProfile] = useState(null);
  const [participationHistory, setParticipationHistory] = useState([]); // (можно оставить, даже если история теперь через ProjectHistory)
  const [loading, setLoading] = useState(false);

  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Таб: восстановление + сохранение (убирает "мигание")
  useEffect(() => {
    if (!user?.role) return;

    const key = `profileActiveTab:${user.role}`;
    const saved = localStorage.getItem(key);

    const allowedTabs =
      user.role === "organizer"
        ? ["profile", "stats", "drafts"]
        : user.role === "volunteer"
        ? ["profile", "history"]
        : user.role === "admin"
        ? ["profile", "admin"]
        : ["profile"];

    if (saved && allowedTabs.includes(saved)) {
      setActiveTab(saved);
    } else {
      setActiveTab("profile");
      localStorage.setItem(key, "profile");
    }
  }, [user?.role]);

  useEffect(() => {
    if (!user?.role) return;
    const key = `profileActiveTab:${user.role}`;
    localStorage.setItem(key, activeTab);
  }, [activeTab, user?.role]);

  // Load profile from server
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;

      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const response = await axios.get("http://localhost:5000/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const userData = response.data;

        const userProfile = {
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          role: userData.role,
          phone: userData.phone || "",
          skills: userData.skills || "",
          interests: userData.interests || "",
          bio: userData.bio || "",
          createdAt: userData.createdAt,
        };

        setProfile(userProfile);
        setFormData({
          firstName: userProfile.firstName || "",
          lastName: userProfile.lastName || "",
          phone: userProfile.phone || "",
          skills: userProfile.skills || "",
          interests: userProfile.interests || "",
          bio: userProfile.bio || "",
        });

        // ✅ Обновляем user в App.js (Navbar и роли синхронизируются)
        if (onUserUpdate) {
          onUserUpdate({
            ...user,
            ...userData,
          });
        }
      } catch (error) {
        console.error("Ошибка при загрузке профиля:", error);

        // fallback: local state из user
        const userProfile = {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          phone: user.phone || "",
          skills: user.skills || "",
          interests: user.interests || "",
          bio: user.bio || "",
          createdAt: user.createdAt || new Date().toISOString(),
        };

        setProfile(userProfile);
        setFormData({
          firstName: userProfile.firstName || "",
          lastName: userProfile.lastName || "",
          phone: userProfile.phone || "",
          skills: userProfile.skills || "",
          interests: userProfile.interests || "",
          bio: userProfile.bio || "",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
    // ✅ ВАЖНО: зависимость только от user.id, чтобы не было "перезапусков" из-за изменения объекта user
  }, [user?.id]);

  // Load participation history (если где-то используется)
  useEffect(() => {
    if (user && activeTab === "history") {
      fetchParticipationHistory();
    }
    // ✅ не зависим от всего user-объекта
  }, [activeTab, user?.id]);

  const fetchParticipationHistory = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await axios.get(
        "http://localhost:5000/api/profile/participation-history",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setParticipationHistory(response.data);
    } catch (error) {
      console.error("Ошибка при загрузке истории участия:", error);
    }
  };

  // Save profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Требуется авторизация");
        return;
      }

      const response = await axios.put(
        "http://localhost:5000/api/profile",
        {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          skills: formData.skills,
          interests: formData.interests,
          bio: formData.bio,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const updatedFields = response.data;

      setProfile((prev) => ({
        ...prev,
        ...updatedFields,
      }));

      setFormData((prev) => ({
        ...prev,
        ...updatedFields,
      }));

      if (onUserUpdate) {
        onUserUpdate({
          ...user,
          ...updatedFields,
        });
      }

      setEditing(false);
      alert("Профиль успешно обновлен!");
    } catch (error) {
      console.error("❌ Ошибка при обновлении профиля:", error);
      alert(
        error.response?.data?.error ||
          error.response?.data?.message ||
          "Ошибка при обновлении профиля"
      );
    }
  };

  // Input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // only phone formatting
    if (name === "phone") {
      let cleanedValue = value.replace(/[^\d+]/g, "");

      if (cleanedValue.startsWith("8")) {
        cleanedValue = "+7" + cleanedValue.substring(1);
      } else if (cleanedValue.startsWith("7") && !cleanedValue.startsWith("+7")) {
        cleanedValue = "+7" + cleanedValue.substring(1);
      } else if (!cleanedValue.startsWith("+") && cleanedValue.length > 0) {
        cleanedValue = "+7" + cleanedValue;
      }

      if (cleanedValue.length > 12) {
        cleanedValue = cleanedValue.substring(0, 12);
      }

      setFormData((prev) => ({
        ...prev,
        [name]: cleanedValue,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Helpers
  const formatPhoneDisplay = (phone) => {
    if (!phone) return "Не указан";

    const cleaned = phone.replace(/\D/g, "");

    if (cleaned.length === 11 && (cleaned.startsWith("7") || cleaned.startsWith("8"))) {
      const match = cleaned.match(/^[78]?(\d{3})(\d{3})(\d{2})(\d{2})$/);
      if (match) {
        return `+7 (${match[1]}) ${match[2]}-${match[3]}-${match[4]}`;
      }
    }
    return phone;
  };

  const handleEditStart = () => {
    setEditing(true);
    setFormData({
      firstName: profile?.firstName || "",
      lastName: profile?.lastName || "",
      phone: profile?.phone || "",
      skills: profile?.skills || "",
      interests: profile?.interests || "",
      bio: profile?.bio || "",
    });
  };

  // Delete account
  const handleDeleteAccount = async () => {
    if (
      !window.confirm(
        "Вы уверены, что хотите удалить аккаунт? Это действие нельзя отменить. Все ваши проекты и заявки будут удалены."
      )
    ) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.delete("http://localhost:5000/api/auth/account", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      alert("Аккаунт успешно удален");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/";
    } catch (error) {
      console.error("Ошибка при удалении аккаунта:", error);
      alert(error.response?.data?.error || "Не удалось удалить аккаунт");
    }
  };

  const generateCertificate = (project) => {
    if (!profile) {
      alert("Не удалось создать сертификат: данные профиля не загружены");
      return;
    }

    const certificateText = `
СЕРТИФИКАТ ВОЛОНТЕРА
Настоящим подтверждается, что
${profile.firstName} ${profile.lastName}
принял(а) участие в проекте:
"${project.project.title}"
Дата участия: ${new Date(project.createdAt).toLocaleDateString("ru-RU")}
Организатор: ${project.project.creator.firstName} ${project.project.creator.lastName}

Благодарим за ваш вклад!
`;

    const blob = new Blob([certificateText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `сертификат_${project.project.title.replace(/\s+/g, "_")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Render guards
  if (!user) {
    return (
      <div className="error-container">
        <div className="error">
          <h2>Ошибка загрузки</h2>
          <p>Пользователь не авторизован</p>
          <div className="error-actions">
            <button
              onClick={() => (window.location.href = "/login")}
              className="btn btn-primary"
              type="button"
            >
              Войти
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading && !profile) {
    return <div className="loading">Подготовка профиля...</div>;
  }

  if (!profile) {
    return <div className="loading">Подготовка профиля...</div>;
  }

  // UI
  return (
    <div className="profile">
      <div className="profile-header">
        <h1>Личный кабинет</h1>
      </div>

      <div className="profile-tabs">
        <button
          className={`tab ${activeTab === "profile" ? "active" : ""}`}
          onClick={() => activeTab !== "profile" && setActiveTab("profile")}
          type="button"
        >
          📝 Профиль
        </button>

        {/* Volunteer: история участия */}
        {user?.role === "volunteer" && (
          <button
            className={`tab ${activeTab === "history" ? "active" : ""}`}
            onClick={() => activeTab !== "history" && setActiveTab("history")}
            type="button"
          >
            📊 История участия
          </button>
        )}

        {/* Organizer: статистика + черновики */}
        {user?.role === "organizer" && (
          <>
            <button
              className={`tab ${activeTab === "stats" ? "active" : ""}`}
              onClick={() => activeTab !== "stats" && setActiveTab("stats")}
              type="button"
            >
              📊 Статистика
            </button>

            <button
              className={`tab ${activeTab === "drafts" ? "active" : ""}`}
              onClick={() => activeTab !== "drafts" && setActiveTab("drafts")}
              type="button"
            >
              📋 Черновики
            </button>
          </>
        )}

        {/* Admin: вкладка в профиле (если оставляешь) */}
        {user?.role === "admin" && (
          <button
            className={`tab ${activeTab === "admin" ? "active" : ""}`}
            onClick={() => activeTab !== "admin" && setActiveTab("admin")}
            type="button"
          >
            🛡️ Админ-панель
          </button>
        )}
      </div>

      <div className="profile-content">
        {activeTab === "profile" && (
          <div className="profile-section">
            <div className="section-header">
              <h2>Личная информация</h2>

              {!editing ? (
                <button className="btn btn-primary" onClick={handleEditStart} type="button">
                  ✏️ Редактировать
                </button>
              ) : (
                <div className="edit-actions">
                  <button className="btn btn-success" onClick={handleSaveProfile} type="button">
                    💾 Сохранить
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setEditing(false);
                      setFormData({
                        firstName: profile.firstName || "",
                        lastName: profile.lastName || "",
                        phone: profile.phone || "",
                        skills: profile.skills || "",
                        interests: profile.interests || "",
                        bio: profile.bio || "",
                      });
                    }}
                    type="button"
                  >
                    Отмена
                  </button>
                </div>
              )}
            </div>

            {editing ? (
              <form className="profile-form">
                <div className="form-group">
                  <label>Имя:</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName || ""}
                    onChange={handleInputChange}
                    placeholder="Введите имя"
                  />
                </div>

                <div className="form-group">
                  <label>Фамилия:</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName || ""}
                    onChange={handleInputChange}
                    placeholder="Введите фамилию"
                  />
                </div>

                <div className="form-group">
                  <label>Телефон:</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone || ""}
                    onChange={handleInputChange}
                    placeholder="+79991234567"
                    pattern="^\\+7\\d{10}$"
                    maxLength="12"
                  />
                  <small>Формат: +79991234567</small>
                </div>

                <div className="form-group">
                  <label>Навыки:</label>
                  <input
                    type="text"
                    name="skills"
                    value={formData.skills || ""}
                    onChange={handleInputChange}
                    placeholder="Перечислите ваши навыки через запятую"
                  />
                </div>

                <div className="form-group">
                  <label>Интересы:</label>
                  <textarea
                    name="interests"
                    value={formData.interests || ""}
                    onChange={handleInputChange}
                    placeholder="Перечислите ваши интересы через запятую"
                    rows="3"
                  />
                </div>

                <div className="form-group">
                  <label>О себе:</label>
                  <textarea
                    name="bio"
                    value={formData.bio || ""}
                    onChange={handleInputChange}
                    placeholder="Расскажите о себе, своем опыте волонтерства"
                    rows="4"
                  />
                </div>
              </form>
            ) : (
              <div className="profile-info">
                <div className="info-grid">
                  <div className="info-item">
                    <strong>Имя:</strong>
                    <span>
                      {profile.firstName} {profile.lastName}
                    </span>
                  </div>

                  <div className="info-item">
                    <strong>Email:</strong>
                    <span>{profile.email}</span>
                  </div>
                  
                  {profile?.role === "volunteer" && (
                  <div className="info-item">
                    <strong>Баллы:</strong>
                    <span>⭐ {profile.points ?? 0}</span>
                  </div>
                  )}

                  <div className="info-item">
                    <strong>Телефон:</strong>
                    <span>{formatPhoneDisplay(profile.phone)}</span>
                  </div>

                  <div className="info-item">
                    <strong>Навыки:</strong>
                    <span>{profile.skills || "Не указаны"}</span>
                  </div>

                  <div className="info-item">
                    <strong>Интересы:</strong>
                    <span>{profile.interests || "Не указаны"}</span>
                  </div>

                  <div className="info-item full-width">
                    <strong>О себе:</strong>
                    <span>{profile.bio || "Не указано"}</span>
                  </div>

                  <div className="info-item">
                    <strong>Дата регистрации:</strong>
                    <span>
                      {profile.createdAt
                        ? new Date(profile.createdAt).toLocaleDateString("ru-RU")
                        : "Неизвестно"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="account-deletion-section">
              <div className="danger-zone">
                <button
                  className="btn btn-danger"
                  onClick={() => setShowDeleteConfirm(true)}
                  type="button"
                >
                  🗑️ Удалить аккаунт
                </button>
              </div>
            </div>

            {showDeleteConfirm && (
              <div className="modal-overlay">
                <div className="modal-content">
                  <div className="modal-header">
                    <h2>Подтверждение удаления аккаунта</h2>
                    <button
                      className="close-btn"
                      onClick={() => setShowDeleteConfirm(false)}
                      type="button"
                    >
                      ×
                    </button>
                  </div>

                  <div className="delete-warning">
                    <div className="warning-icon">⚠️</div>
                    <h3>Внимание! Это действие необратимо</h3>
                    <p>При удалении аккаунта будут безвозвратно удалены:</p>
                    <ul>
                      <li>✅ Все ваши личные данные</li>
                      <li>✅ Все созданные вами проекты</li>
                      <li>✅ Все поданные заявки</li>
                      <li>✅ Вся история участия</li>
                    </ul>
                    <p>
                      <strong>Вы уверены, что хотите продолжить?</strong>
                    </p>
                  </div>

                  <div className="modal-actions">
                    <button
                      className="btn btn-danger"
                      onClick={handleDeleteAccount}
                      type="button"
                    >
                      Да, удалить аккаунт
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setShowDeleteConfirm(false)}
                      type="button"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div className="profile-section">
            <h2>История участия</h2>
            <ProjectHistory user={user} generateCertificate={generateCertificate} />
          </div>
        )}

        {activeTab === "stats" && user?.role === "organizer" && (
          <div className="profile-section">
            <OrganizerStats user={user} />
          </div>
        )}

        {activeTab === "drafts" && user?.role === "organizer" && (
          <div className="profile-section">
            <DraftProjects user={user} />
          </div>
        )}

        {activeTab === "admin" && user?.role === "admin" && (
  <div className="profile-section">
    <AdminDashboard
      user={user}
      onOpenFullAdmin={() => (window.location.href = "/admin")}
    />
  </div>
)}
      </div>
    </div>
  );
}

export default Profile;
