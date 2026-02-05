import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './DraftProjects.css';
import { useNavigate } from 'react-router-dom';

function DraftProjects({ user }) {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDrafts();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchDrafts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/api/projects?status=DRAFT', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setDrafts(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Ошибка при загрузке черновиков:', error);
      setLoading(false);
    }
  };

  const handlePublish = async (projectId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `http://localhost:3000/api/projects/${projectId}`,
        { status: 'ACTIVE' },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      alert('Проект опубликован!');
      fetchDrafts(); // Обновляем список
    } catch (error) {
      console.error('Ошибка при публикации проекта:', error);
      alert('Ошибка при публикации проекта');
    }
  };

  const navigate = useNavigate();
  const handleEdit = (project) => {
    window.location.href = `/edit-project/${project.id}`;
    navigate(`/edit-project/${project.id}`);
  };

  const handleDelete = async (projectId) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот черновик?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:3000/api/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      alert('Черновик удален!');
      fetchDrafts(); // Обновляем список
    } catch (error) {
      console.error('Ошибка при удалении черновика:', error);
      alert('Ошибка при удалении черновика');
    }
  };

  // Проверка пользователя после хуков
  if (!user) {
    return <div className="loading">Загрузка пользователя...</div>;
  }

  if (loading) {
    return <div className="loading">Загрузка черновиков...</div>;
  }

  return (
    <div className="draft-projects">
      <div className="drafts-header">
        <h2>Мои черновики</h2>
        <p>Здесь отображаются проекты, которые еще не опубликованы</p>
      </div>

      {drafts.length === 0 ? (
        <div className="no-drafts">
          <h3>Черновиков нет</h3>
          <p>У вас пока нет сохраненных черновиков проектов.</p>
          <button 
            className="btn btn-primary"
            onClick={() => window.location.href = '/create-project'}
          >
            Создать проект
          </button>
        </div>
      ) : (
        <div className="drafts-list">
          {drafts.map(project => (
            <div key={project.id} className="draft-card">
              <div className="draft-content">
                <h3>{project.title}</h3>
                <p className="draft-description">{project.description}</p>
                
                <div className="draft-details">
                  <div className="detail-item">
                    <strong>Тип:</strong>
                    <span>{project.projectType || 'Не указан'}</span>
                  </div>
                  <div className="detail-item">
                    <strong>Местоположение:</strong>
                    <span>{project.location || 'Не указано'}</span>
                  </div>
                  <div className="detail-item">
                    <strong>Нужно волонтеров:</strong>
                    <span>{project.volunteersRequired || 1}</span>
                  </div>
                  <div className="detail-item">
                    <strong>Дата создания:</strong>
                    <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="draft-actions">
                <button
                  className="btn btn-success"
                  onClick={() => handlePublish(project.id)}
                >
                  Опубликовать
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => handleEdit(project)}
                >
                  Редактировать
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleDelete(project.id)}
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default DraftProjects;