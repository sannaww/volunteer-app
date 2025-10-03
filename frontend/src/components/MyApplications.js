import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './MyApplications.css';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

function MyApplications({ user }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Функция для перевода статусов
  const getStatusText = (status) => {
    switch (status) {
      case 'PENDING': return '⏳ На рассмотрении';
      case 'APPROVED': return '✅ Одобрена';
      case 'REJECTED': return '❌ Отклонена';
      default: return status;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'PENDING': return 'status-pending';
      case 'APPROVED': return 'status-approved';
      case 'REJECTED': return 'status-rejected';
      default: return '';
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('${API_URL}/api/my-applications', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setApplications(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Ошибка при загрузке заявок:', error);
      alert(error.response?.data?.error || 'Ошибка при загрузке заявок');
      setLoading(false);
    }
  };

  // Функция для отмены заявки
  const handleCancelApplication = async (applicationId) => {
    if (!window.confirm('Вы уверены, что хотите отменить заявку?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`${API_URL}/api/applications/${applicationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Удаляем заявку из состояния
      setApplications(applications.filter(app => app.id !== applicationId));
      alert(response.data.message || 'Заявка успешно отменена');
    } catch (error) {
      console.error('Ошибка при отмене заявки:', error);
      alert(error.response?.data?.error || 'Ошибка при отмене заявки');
    }
  };

  if (loading) {
    return <div className="loading">Загрузка ваших заявок...</div>;
  }

  return (
    <div className="my-applications">
      <h1>Мои заявки</h1>
      {applications.length === 0 ? (
        <div className="no-applications">
          <p>У вас пока нет заявок на проекты</p>
          <a href="/" className="browse-projects-link">Найти проекты</a>
        </div>
      ) : (
        <div className="applications-list">
          {applications.map(application => (
            <div key={application.id} className="application-card">
              <div className="application-header">
                <h3>{application.project.title}</h3>
                <span className={`status ${getStatusClass(application.status)}`}>
                  {getStatusText(application.status)}
                </span>
              </div>
              
              <div className="application-details">
                <p><strong>Организатор:</strong> {application.project.creator.firstName} {application.project.creator.lastName}</p>
                <p><strong>Дата проекта:</strong> {application.project.startDate ? new Date(application.project.startDate).toLocaleDateString() : 'Не указана'}</p>
                <p><strong>Местоположение:</strong> {application.project.location || 'Не указано'}</p>
                {application.message && (
                  <p><strong>Ваше сообщение:</strong> {application.message}</p>
                )}
                <p><strong>Дата подачи:</strong> {new Date(application.createdAt).toLocaleString()}</p>
              </div>

              {/* Кнопка отмены заявки - показывается только для заявок со статусом PENDING */}
              {application.status === 'PENDING' && (
                <div className="application-actions">
                  <button 
                    className="btn-cancel"
                    onClick={() => handleCancelApplication(application.id)}
                  >
                    Отменить заявку
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyApplications;