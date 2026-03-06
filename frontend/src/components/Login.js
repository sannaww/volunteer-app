import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import api from "../api/client";
import { useFeedback } from "./ui/FeedbackProvider";
import { consumePrefillLoginEmail, setSessionToken, setSessionUser } from "../utils/authSession";
import "./Auth.css";

function Login({ onLogin }) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);

  const passwordRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { error } = useFeedback();
  const from = location.state?.from || "/";

  useEffect(() => {
    const savedEmail = consumePrefillLoginEmail();
    if (!savedEmail) return;

    setFormData((prev) => ({
      ...prev,
      email: savedEmail,
    }));

    window.setTimeout(() => {
      passwordRef.current?.focus();
    }, 0);
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    try {
      const response = await api.post("/api/auth/login", {
        email: formData.email.trim(),
        password: formData.password,
      });

      setSessionToken(response.data.token);
      setSessionUser(response.data.user);

      onLogin?.(response.data.user);
      navigate(from, { replace: true });
    } catch (requestError) {
      const message =
        requestError.response?.data?.message ||
        requestError.response?.data?.error ||
        "Не удалось выполнить вход";

      error(message, "Ошибка авторизации");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Вход</h2>

        <div className="form-group">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
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
          <label htmlFor="login-password">Пароль</label>
          <input
            id="login-password"
            ref={passwordRef}
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            disabled={loading}
            autoComplete="current-password"
          />
        </div>

        <button type="submit" className="auth-btn" disabled={loading}>
          {loading ? "Выполняем вход..." : "Войти"}
        </button>

        <p className="auth-link">
          Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
        </p>
      </form>
    </div>
  );
}

export default Login;
