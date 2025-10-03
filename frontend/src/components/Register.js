import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import './Auth.css';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

function Register({ onLogin }) {  // Добавьте пропс onLogin
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'volunteer'
  });

  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      const response = await axios.post('${API_URL}/api/auth/register', formData);
      
      if (response.data.message) {
        setMessage(response.data.message);
        setIsSuccess(true);
        
        // Автоматически входим после успешной регистрации
        try {
          const loginResponse = await axios.post('${API_URL}/api/auth/login', {
            email: formData.email,
            password: formData.password
          });

          // Сохраняем токен и пользователя
          localStorage.setItem('token', loginResponse.data.token);
          localStorage.setItem('user', JSON.stringify(loginResponse.data.user));

          // Вызываем колбэк для обновления состояния в App.js
          if (onLogin) {
            onLogin(loginResponse.data.user);
          }

          // Перенаправляем на главную страницу
          navigate('/');
          
        } catch (loginError) {
          console.error('Ошибка при автоматическом входе:', loginError);
          // Если автоматический вход не удался, просто показываем сообщение об успехе
          setMessage('Регистрация успешна! Теперь вы можете войти в систему.');
        }
      }
    } catch (error) {
      setMessage(error.response?.data?.error || 'Ошибка при регистрации');
      setIsSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Регистрация</h2>

        {message && (
          <div className={`message ${isSuccess ? 'success' : 'error'}`}>
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
            minLength="6"
          />
        </div>

        <div className="form-group">
          <label>Роль:</label>
          <select name="role" value={formData.role} onChange={handleChange}>
            <option value="volunteer">Волонтер</option>
            <option value="organizer">Организатор</option>
          </select>
        </div>

        <button 
          type="submit" 
          className="auth-btn"
          disabled={loading}
        >
          {loading ? 'Регистрация...' : 'Зарегистрироваться'}
        </button>

        <p className="auth-link">
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </form>
    </div>
  );
}

export default Register;