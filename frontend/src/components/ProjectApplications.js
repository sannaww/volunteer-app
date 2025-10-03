import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import './ProjectApplications.css';

function ProjectApplications({ user }) {
  const { projectId } = useParams();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);

  // Добавляем функцию для перевода статусов
  const getStatusText = (status) => {
    switch (status) {
      case 'PENDING': return '⏳ На рассмотрении';
      case 'APPROVED': return '✅ Одобрена';
      case 'REJECTED': return '❌ Отклонена';
      default: return status;
    }
  };

  useEffect(() => {
  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // ДОБАВЛЯЕМ ОТЛАДОЧНУЮ ИНФОРМАЦИЮ
      console.log('=== ОТЛАДКА ProjectApplications ===');
      console.log('Token из localStorage:', token);
      console.log('Project ID из URL:', projectId);
      console.log('Полный URL:', `http://localhost:3000/api/projects/${projectId}/applications`);
      
      if (!token) {
        console.error('❌ Токен не найден в localStorage!');
        alert('Требуется авторизация. Пожалуйста, войдите снова.');
        return;
      }

      // Получаем заявки
      console.log('🔄 Отправляем запрос на получение заявок...');
      const applicationsResponse = await axios.get(
        `http://localhost:3000/api/projects/${projectId}/applications`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      console.log('✅ Заявки успешно получены:', applicationsResponse.data);
      setApplications(applicationsResponse.data);

      // Получаем информацию о проекте
      console.log('🔄 Отправляем запрос на получение информации о проекте...');
      const projectResponse = await axios.get(`http://localhost:3000/api/projects/${projectId}`);
      console.log('✅ Информация о проекте получена:', projectResponse.data);
      setProject(projectResponse.data);

      setLoading(false);
      console.log('=== ОТЛАДКА ЗАВЕРШЕНА ===');
    } catch (error) {
      console.error('❌ Полная ошибка при загрузке данных:', error);
      console.error('Детали ошибки:');
      console.error('- Сообщение:', error.message);
      console.error('- Код ошибки:', error.code);
      console.error('- URL запроса:', error.config?.url);
      console.error('- Метод запроса:', error.config?.method);
      console.error('- Заголовки:', error.config?.headers);
      console.error('- Статус ответа:', error.response?.status);
      console.error('- Данные ответа:', error.response?.data);
      console.error('- Текст статуса:', error.response?.statusText);
      
      alert(error.response?.data?.error || 'Ошибка при загрузке заявок');
      setLoading(false);
    }
  };

  fetchData();
}, [projectId]);

  const handleStatusUpdate = async (applicationId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `http://localhost:3000/api/applications/${applicationId}`,
        { status: newStatus },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      // Обновляем список заявок
      setApplications(applications.map(app => 
        app.id === applicationId ? { ...app, status: newStatus } : app
      ));
    } catch (error) {
      alert(error.response?.data?.error || 'Ошибка при обновлении статуса');
    }
  };

  if (loading) {
    return <div className="loading">Загрузка заявок...</div>;
  }

  if (!project) {
    return <div className="error">Проект не найден</div>;
  }

  return (
    <div className="project-applications">
      <h1>Заявки на проект: {project.title}</h1>
      <p className="project-description">{project.description}</p>
      
      {applications.length === 0 ? (
        <div className="no-applications">
          <p>Пока нет заявок на этот проект</p>
        </div>
      ) : (
        <div className="applications-list">
          {applications.map(application => (
            <div key={application.id} className="application-card">
              <div className="application-header">
                <h3>{application.user.firstName} {application.user.lastName}</h3>
                {/* ЗДЕСЬ ПРОИСХОДИТ ЗАМЕНА - эта строка меняется */}
                <span className={`status status-${application.status.toLowerCase()}`}>
                  {getStatusText(application.status)}
                </span>
              </div>
              
              <div className="application-details">
                <p><strong>Email:</strong> {application.user.email}</p>
                <p><strong>Роль:</strong> {application.user.role === 'volunteer' ? 'Волонтер' : 'Организатор'}</p>
                {application.message && (
                  <p><strong>Сообщение:</strong> {application.message}</p>
                )}
                <p><strong>Дата подачи:</strong> {new Date(application.createdAt).toLocaleString()}</p>
              </div>

              {application.status === 'PENDING' && (
                <div className="application-actions">
                  <button 
                    className="btn-approve"
                    onClick={() => handleStatusUpdate(application.id, 'APPROVED')}
                  >
                    Одобрить
                  </button>
                  <button 
                    className="btn-reject"
                    onClick={() => handleStatusUpdate(application.id, 'REJECTED')}
                  >
                    Отклонить
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

export default ProjectApplications;