import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './OrganizerStats.css';

function OrganizerStats({ user }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStats();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/api/organizer/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setStats(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Ошибка при загрузке статистики:', error);
      setLoading(false);
    }
  };

  // Проверка пользователя после хуков
  if (!user) {
    return <div className="loading">Загрузка пользователя...</div>;
  }

  if (loading) {
    return <div className="loading">Загрузка статистики...</div>;
  }

  if (!stats) {
    return <div className="error">Не удалось загрузить статистику</div>;
  }

  const getStatusText = (status) => {
    const statusMap = {
      'PENDING': '⏳ На рассмотрении',
      'APPROVED': '✅ Одобрена',
      'REJECTED': '❌ Отклонена',
      'DRAFT': '📝 Черновик',
      'ACTIVE': '🟢 Активный',
      'COMPLETED': '✅ Завершен',
      'CANCELLED': '🔴 Отменен'
    };
    return statusMap[status] || status;
  };

  return (
    <div className="organizer-stats">
      <div className="stats-header">
        <h2>Статистика организатора</h2>
        <button className="btn-refresh" onClick={fetchStats}>
          🔄 Обновить
        </button>
      </div>

      <div className="stats-grid">
        {/* Карточка общих проектов */}
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>{stats.projects.total}</h3>
            <p>Всего проектов</p>
          </div>
        </div>

        {/* Карточка заявок */}
        <div className="stat-card">
          <div className="stat-icon">📨</div>
          <div className="stat-content">
            <h3>{stats.applications.total}</h3>
            <p>Всего заявок</p>
          </div>
        </div>

        {/* Карточка волонтеров */}
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>{stats.applications.uniqueVolunteers}</h3>
            <p>Уникальных волонтеров</p>
          </div>
        </div>

        {/* Самый популярный проект */}
        {stats.popularProject && (
          <div className="stat-card">
            <div className="stat-icon">🔥</div>
            <div className="stat-content">
              <h3>{stats.popularProject.applicationsCount}</h3>
              <p>Заявок на "{stats.popularProject.title}"</p>
            </div>
          </div>
        )}
      </div>

      {/* Детальная статистика */}
      <div className="detailed-stats">
        <div className="stats-section">
          <h3>Проекты по статусам</h3>
          <div className="status-stats">
            {Object.entries(stats.projects.byStatus).map(([status, count]) => (
              <div key={status} className="status-item">
                <span className="status-label">{getStatusText(status)}</span>
                <span className="status-count">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="stats-section">
          <h3>Заявки по статусам</h3>
          <div className="status-stats">
            {Object.entries(stats.applications.byStatus).map(([status, count]) => (
              <div key={status} className="status-item">
                <span className="status-label">{getStatusText(status)}</span>
                <span className="status-count">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Последние заявки */}
      {stats.recentApplications.length > 0 && (
        <div className="recent-applications">
          <h3>Последние заявки</h3>
          <div className="applications-list">
            {stats.recentApplications.map(app => (
              <div key={app.id} className="application-item">
                <div className="app-info">
                  <strong>{app.volunteerName}</strong>
                  <span> подал(а) заявку на "{app.projectTitle}"</span>
                </div>
                <div className="app-meta">
                  <span className={`status status-${app.status.toLowerCase()}`}>
                    {getStatusText(app.status)}
                  </span>
                  <span>{new Date(app.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.projects.total === 0 && (
        <div className="empty-stats">
          <p>У вас пока нет проектов</p>
          <p>Создайте первый проект, чтобы увидеть статистику</p>
          <button 
            className="btn btn-primary"
            onClick={() => window.location.href = '/create-project'}
          >
            Создать проект
          </button>
        </div>
      )}
    </div>
  );
}

export default OrganizerStats;