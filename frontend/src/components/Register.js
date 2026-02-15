import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/client";
import "./Auth.css";

function Register() {
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

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const getNiceError = (err) => {
    const status = err?.response?.status;
    const msg = err?.response?.data?.message || err?.response?.data?.error || "";

    // корректное сообщение для повторной регистрации
    if (status === 409) return "Пользователь с такими данными уже есть";
    if (String(msg).toLowerCase().includes("уже существует")) {
      return "Пользователь с такими данными уже есть";
    }

    return msg || "Ошибка регистрации";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setMessage("");
    setIsSuccess(false);
    setLoading(true);

    try {
      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: formData.role, // volunteer | organizer
        contactInfo: formData.contactInfo.trim() || null,
      };

      await api.post("/api/auth/register", payload);

      setIsSuccess(true);
      setMessage("Регистрация успешна! Перенаправляем на вход...");
      // ✅ сохраняем, чтобы Login подтянул поля
      sessionStorage.setItem("prefillLoginEmail", payload.email);

      // ✅ Вариант: на страницу "Войти"
      navigate("/login");

      // ✅ Если хочешь на главную — вместо этого:
      // navigate("/");
    } catch (err) {
      setIsSuccess(false);
      setMessage(getNiceError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Регистрация</h2>

        {message && (
          <div className={`message ${isSuccess ? "success" : "error"}`}>
            {message}
          </div>
        )}

        <div className="form-group">
          <label>Имя:</label>
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>Фамилия:</label>
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>Email:</label>
          <input
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
          <label>Пароль:</label>
          <input
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
          <label>Контакт (необязательно):</label>
          <input
            type="text"
            name="contactInfo"
            value={formData.contactInfo}
            onChange={handleChange}
            disabled={loading}
            placeholder="+79991234567 или email"
          />
        </div>

        <div className="form-group">
          <label>Роль:</label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            disabled={loading}
          >
            <option value="volunteer">Волонтер</option>
            <option value="organizer">Организатор</option>
          </select>
        </div>

        <button type="submit" className="auth-btn" disabled={loading}>
          {loading ? "Регистрация..." : "Зарегистрироваться"}
        </button>

        <p className="auth-link">
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </form>
    </div>
  );
}

export default Register;
