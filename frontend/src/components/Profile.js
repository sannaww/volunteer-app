import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../api/client";
import {
  clearSession,
  getProfileActiveTab,
  setProfileActiveTab,
} from "../utils/authSession";
import { formatDate, formatPhoneDisplay } from "../utils/formatters";
import { getRoleLabel } from "../utils/presentation";
import AdminPanel from "./AdminPanel";
import DraftProjects from "./DraftProjects";
import OrganizerMyProjects from "./OrganizerMyProjects";
import OrganizerStats from "./OrganizerStats";
import ProjectHistory from "./ProjectHistory";
import Icon from "./ui/Icon";
import { useFeedback } from "./ui/FeedbackProvider";
import "./Profile.css";

const ROLE_TABS = {
  volunteer: [
    { id: "profile", label: "Профиль", icon: "badge" },
    { id: "history", label: "История", icon: "history" },
  ],
  organizer: [
    { id: "profile", label: "Профиль", icon: "badge" },
    { id: "stats", label: "Статистика", icon: "bar_chart" },
    { id: "myProjects", label: "Мои проекты", icon: "folder_open" },
    { id: "drafts", label: "Черновики", icon: "draft" },
  ],
  admin: [
    { id: "profile", label: "Профиль", icon: "badge" },
    { id: "admin", label: "Администрирование", icon: "shield" },
  ],
};

function getFallbackProfile(user) {
  return {
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    role: user?.role || "",
    points: user?.points ?? 0,
    phone: user?.phone || "",
    skills: user?.skills || "",
    interests: user?.interests || "",
    bio: user?.bio || "",
    createdAt: user?.createdAt || "",
  };
}

function Profile({ user, onUserUpdate }) {
  const [activeTab, setActiveTab] = useState("profile");
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    skills: "",
    interests: "",
    bio: "",
  });

  const navigate = useNavigate();
  const { confirm, error, success } = useFeedback();

  const tabs = useMemo(() => ROLE_TABS[user?.role] || ROLE_TABS.volunteer, [user?.role]);

  useEffect(() => {
    if (!user?.role) return;

    const allowedTabs = tabs.map((tab) => tab.id);
    const savedTab = getProfileActiveTab(user.role);
    const nextTab = savedTab && allowedTabs.includes(savedTab) ? savedTab : "profile";
    setActiveTab(nextTab);
  }, [tabs, user?.role]);

  useEffect(() => {
    if (!user?.role || !activeTab) return;
    setProfileActiveTab(user.role, activeTab);
  }, [activeTab, user?.role]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const response = await api.get("/api/auth/me");
        const nextProfile = {
          firstName: response.data?.firstName || "",
          lastName: response.data?.lastName || "",
          email: response.data?.email || "",
          role: response.data?.role || user.role,
          points:
            typeof response.data?.points === "number"
              ? response.data.points
              : user.points ?? 0,
          phone: response.data?.phone || "",
          skills: response.data?.skills || "",
          interests: response.data?.interests || "",
          bio: response.data?.bio || "",
          createdAt: response.data?.createdAt || user.createdAt || "",
        };

        setProfile(nextProfile);
        setFormData({
          firstName: nextProfile.firstName,
          lastName: nextProfile.lastName,
          phone: nextProfile.phone,
          skills: nextProfile.skills,
          interests: nextProfile.interests,
          bio: nextProfile.bio,
        });

        onUserUpdate?.({
          ...user,
          ...response.data,
        });
      } catch (requestError) {
        console.error("Ошибка при загрузке профиля:", requestError);
        const fallbackProfile = getFallbackProfile(user);
        setProfile(fallbackProfile);
        setFormData({
          firstName: fallbackProfile.firstName,
          lastName: fallbackProfile.lastName,
          phone: fallbackProfile.phone,
          skills: fallbackProfile.skills,
          interests: fallbackProfile.interests,
          bio: fallbackProfile.bio,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user?.id]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    if (name === "phone") {
      let nextPhone = value.replace(/[^\d+]/g, "");

      if (nextPhone.startsWith("8")) {
        nextPhone = `+7${nextPhone.slice(1)}`;
      } else if (nextPhone.startsWith("7") && !nextPhone.startsWith("+7")) {
        nextPhone = `+7${nextPhone.slice(1)}`;
      } else if (nextPhone && !nextPhone.startsWith("+")) {
        nextPhone = `+7${nextPhone}`;
      }

      setFormData((prev) => ({
        ...prev,
        [name]: nextPhone.slice(0, 12),
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleStartEditing = () => {
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

  const handleCancelEditing = () => {
    setEditing(false);
    setFormData({
      firstName: profile?.firstName || "",
      lastName: profile?.lastName || "",
      phone: profile?.phone || "",
      skills: profile?.skills || "",
      interests: profile?.interests || "",
      bio: profile?.bio || "",
    });
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();

    try {
      const response = await api.put("/api/profile", {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        skills: formData.skills,
        interests: formData.interests,
        bio: formData.bio,
      });

      const updatedProfile = {
        ...profile,
        ...response.data,
      };

      setProfile(updatedProfile);
      setEditing(false);
      success("Профиль обновлён.");

      onUserUpdate?.({
        ...user,
        ...response.data,
      });
    } catch (requestError) {
      console.error("Ошибка обновления профиля:", requestError);
      error(
        requestError.response?.data?.error ||
          requestError.response?.data?.message ||
          "Не удалось обновить профиль"
      );
    }
  };

  const handleDeleteAccount = async () => {
    const approved = await confirm({
      title: "Удалить аккаунт?",
      message:
        "Это действие необратимо. Все ваши проекты, заявки и связанные данные будут удалены.",
      confirmLabel: "Удалить аккаунт",
      cancelLabel: "Отмена",
      tone: "danger",
    });

    if (!approved) return;

    try {
      await api.delete("/api/auth/account");
      clearSession();
      onUserUpdate?.(null);
      success("Аккаунт удалён.");
      navigate("/", { replace: true });
    } catch (requestError) {
      console.error("Ошибка удаления аккаунта:", requestError);
      error(requestError.response?.data?.error || "Не удалось удалить аккаунт");
    }
  };

  const generateCertificate = (participation) => {
    if (!profile) {
      error("Не удалось создать сертификат: профиль ещё не загружен.");
      return;
    }

    const certificateText = [
      "СЕРТИФИКАТ ВОЛОНТЁРА",
      "",
      "Настоящим подтверждается, что",
      `${profile.firstName} ${profile.lastName}`.trim(),
      "принял(а) участие в проекте:",
      `"${participation.project?.title || "Проект"}"`,
      `Дата участия: ${formatDate(participation.createdAt)}`,
      `Организатор: ${participation.project?.creator?.firstName || ""} ${
        participation.project?.creator?.lastName || ""
      }`.trim(),
      "",
      "Благодарим за вклад в развитие проекта.",
    ].join("\n");

    const file = new Blob([certificateText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `certificate_${(participation.project?.title || "project").replace(/\s+/g, "_")}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  if (!user) {
    return (
      <div className="error-container">
        <div className="error">
          <h2>Пользователь не авторизован</h2>
          <p>Чтобы открыть личный кабинет, необходимо войти в систему.</p>
          <button type="button" className="btn btn-primary" onClick={() => navigate("/login")}>
            <Icon name="login" />
            <span>Войти</span>
          </button>
        </div>
      </div>
    );
  }

  if (loading || !profile) {
    return <div className="loading">Подготавливаем личный кабинет...</div>;
  }

  return (
    <div className="profile">
      <section className="profile-hero">
        <div>
          <p className="section-kicker">Личный кабинет</p>
          <h1>{`${profile.firstName} ${profile.lastName}`.trim() || profile.email}</h1>
          <p>
            {getRoleLabel(profile.role)}. Здесь собраны профиль, рабочие вкладки и роль-зависимые
            инструменты.
          </p>
        </div>

        <div className="profile-summary">
          <div className="profile-summary-item">
            <span>Email</span>
            <strong>{profile.email}</strong>
          </div>
          <div className="profile-summary-item">
            <span>Роль</span>
            <strong>{getRoleLabel(profile.role)}</strong>
          </div>
          <div className="profile-summary-item">
            <span>Дата регистрации</span>
            <strong>{formatDate(profile.createdAt)}</strong>
          </div>
          {profile.role === "volunteer" ? (
            <div className="profile-summary-item">
              <span>Баллы</span>
              <strong>{profile.points ?? 0}</strong>
            </div>
          ) : null}
        </div>
      </section>

      <div className="profile-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <Icon name={tab.icon} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="profile-content">
        {activeTab === "profile" ? (
          <section className="profile-section">
            <div className="section-header">
              <div>
                <h2>Личные данные</h2>
                <p>Контактная информация и личное описание, которое видят другие участники платформы.</p>
              </div>

              {!editing ? (
                <button type="button" className="btn btn-primary" onClick={handleStartEditing}>
                  <Icon name="edit" />
                  <span>Редактировать</span>
                </button>
              ) : (
                <div className="profile-actions">
                  <button type="submit" form="profile-form" className="btn btn-primary">
                    <Icon name="save" />
                    <span>Сохранить</span>
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={handleCancelEditing}>
                    <Icon name="close" />
                    <span>Отмена</span>
                  </button>
                </div>
              )}
            </div>

            {editing ? (
              <form id="profile-form" className="profile-form" onSubmit={handleSaveProfile}>
                <label className="form-group">
                  <span>Имя</span>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="Введите имя"
                  />
                </label>

                <label className="form-group">
                  <span>Фамилия</span>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Введите фамилию"
                  />
                </label>

                <label className="form-group">
                  <span>Телефон</span>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+79991234567"
                  />
                </label>

                <label className="form-group">
                  <span>Навыки</span>
                  <input
                    type="text"
                    name="skills"
                    value={formData.skills}
                    onChange={handleInputChange}
                    placeholder="Например: организация, работа с детьми, логистика"
                  />
                </label>

                <label className="form-group form-group-wide">
                  <span>Интересы</span>
                  <textarea
                    name="interests"
                    rows={3}
                    value={formData.interests}
                    onChange={handleInputChange}
                    placeholder="Опишите, какие направления вам интересны"
                  />
                </label>

                <label className="form-group form-group-wide">
                  <span>О себе</span>
                  <textarea
                    name="bio"
                    rows={5}
                    value={formData.bio}
                    onChange={handleInputChange}
                    placeholder="Коротко расскажите о себе и опыте участия в проектах"
                  />
                </label>
              </form>
            ) : (
              <div className="profile-info-grid">
                <InfoCard label="Имя и фамилия" value={`${profile.firstName} ${profile.lastName}`.trim() || "Не указано"} />
                <InfoCard label="Телефон" value={formatPhoneDisplay(profile.phone)} />
                <InfoCard label="Навыки" value={profile.skills || "Не указаны"} />
                <InfoCard label="Интересы" value={profile.interests || "Не указаны"} />
                <InfoCard label="О себе" value={profile.bio || "Не указано"} wide />
              </div>
            )}

            <div className="danger-zone">
              <div>
                <h3>Удаление аккаунта</h3>
                <p>
                  Используйте только если действительно хотите удалить профиль и связанные с ним
                  данные без возможности восстановления.
                </p>
              </div>
              <button type="button" className="btn btn-danger" onClick={handleDeleteAccount}>
                <Icon name="delete_forever" />
                <span>Удалить аккаунт</span>
              </button>
            </div>
          </section>
        ) : null}

        {activeTab === "history" ? (
          <section className="profile-section">
            <div className="section-header">
              <div>
                <h2>История участия</h2>
                <p>Завершённые или отменённые проекты, в которых вы были подтверждённым участником.</p>
              </div>
            </div>
            <ProjectHistory user={user} generateCertificate={generateCertificate} />
          </section>
        ) : null}

        {activeTab === "stats" && user.role === "organizer" ? (
          <section className="profile-section">
            <OrganizerStats user={user} />
          </section>
        ) : null}

        {activeTab === "myProjects" && user.role === "organizer" ? (
          <section className="profile-section">
            <div className="section-header">
              <div>
                <h2>Мои проекты</h2>
                <p>Активные инициативы, требующие сопровождения и обработки заявок.</p>
              </div>
            </div>
            <OrganizerMyProjects user={user} />
          </section>
        ) : null}

        {activeTab === "drafts" && user.role === "organizer" ? (
          <section className="profile-section">
            <DraftProjects user={user} />
          </section>
        ) : null}

        {activeTab === "admin" && user.role === "admin" ? (
          <section className="profile-section">
            <AdminPanel user={user} embedded onOpenFullAdmin={() => navigate("/admin")} />
          </section>
        ) : null}
      </div>
    </div>
  );
}

function InfoCard({ label, value, wide = false }) {
  return (
    <article className={`profile-info-card ${wide ? "profile-info-card-wide" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

export default Profile;
