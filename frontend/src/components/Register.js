import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import api from "../api/client";
import { setPrefillLoginEmail, setSessionToken, setSessionUser } from "../utils/authSession";
import "./Auth.css";

function Register({ onLogin }) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "volunteer",
    contactInfo: "",
  });
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const getNiceError = (requestError) => {
    const status = requestError?.response?.status;
    const message =
      requestError?.response?.data?.message ||
      requestError?.response?.data?.error ||
      "";

    if (status === 409) return "Пользователь с такими данными уже существует";
    if (String(message).toLowerCase().includes("уже существует")) {
      return "Пользователь с такими данными уже существует";
    }

    return message || "Ошибка регистрации";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    setMessage("");
    setIsSuccess(false);
    setLoading(true);

    const payload = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim(),
      password: formData.password,
      role: formData.role,
      contactInfo: formData.contactInfo.trim() || null,
    };

    try {
      await api.post("/api/auth/register", payload);

      try {
        const loginResponse = await api.post("/api/auth/login", {
          email: payload.email,
          password: payload.password,
        });

        setSessionToken(loginResponse.data.token);
        setSessionUser(loginResponse.data.user);
        onLogin?.(loginResponse.data.user);
        navigate("/", { replace: true });
      } catch (loginError) {
        setIsSuccess(false);
        setMessage("Аккаунт создан, но автоматический вход не выполнился. Перенаправляем на страницу входа.");
        setPrefillLoginEmail(payload.email);
        console.error("Ошибка автоматического входа после регистрации:", loginError);
        window.setTimeout(() => {
          navigate("/login", { replace: true });
        }, 300);
      }
    } catch (requestError) {
      setIsSuccess(false);
      setMessage(getNiceError(requestError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Регистрация</h2>

        {message ? <div className={`message ${isSuccess ? "success" : "error"}`}>{message}</div> : null}

        <div className="form-group">
          <label htmlFor="register-first-name">Имя</label>
          <input
            id="register-first-name"
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="register-last-name">Фамилия</label>
          <input
            id="register-last-name"
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="register-email">Email</label>
          <input
            id="register-email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            disabled={loading}
            autoComplete="email"
          />
        </div>

        <div className="form-group">
          <label htmlFor="register-password">Пароль</label>
          <input
            id="register-password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            minLength={6}
            disabled={loading}
            autoComplete="new-password"
          />
        </div>

        <div className="form-group">
          <label htmlFor="register-contact-info">Контакты</label>
          <input
            id="register-contact-info"
            type="text"
            name="contactInfo"
            value={formData.contactInfo}
            onChange={handleChange}
            disabled={loading}
            placeholder="+79991234567 или email"
          />
        </div>

        <div className="form-group">
          <label htmlFor="register-role">Роль</label>
          <select id="register-role" name="role" value={formData.role} onChange={handleChange} disabled={loading}>
            <option value="volunteer">Волонтер</option>
            <option value="organizer">Организатор</option>
          </select>
        </div>

        <button type="submit" className="auth-btn" disabled={loading}>
          {loading ? "Создаем аккаунт..." : "Зарегистрироваться"}
        </button>

        <p className="auth-link">
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </form>
    </div>
  );
}

export default Register;
