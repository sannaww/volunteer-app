import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ProjectFilters from './ProjectFilters';
import './ProjectList.css';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

function ProjectList({ user }) {
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    projectType: '',
    location: '',
    dateFrom: '',
    dateTo: ''
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [editingProject, setEditingProject] = useState(null);

  useEffect(() => {
    fetchProjects();
    
    // Автоматическое обновление каждые 30 секунд
    // const interval = setInterval(fetchProjects, 30000);
    
    // return () => clearInterval(interval);
  }, []);

  const fetchProjects = async (currentFilters = filters) => {
  try {
    setLoading(true);
    
    // Создаем параметры запроса
    const params = new URLSearchParams();
    if (currentFilters.search) params.append('search', currentFilters.search);
    if (currentFilters.projectType) params.append('projectType', currentFilters.projectType);
    if (currentFilters.location) params.append('location', currentFilters.location);
    if (currentFilters.dateFrom) params.append('dateFrom', currentFilters.dateFrom);
    if (currentFilters.dateTo) params.append('dateTo', currentFilters.dateTo);
    if (currentFilters.status) params.append('status', currentFilters.status);

    console.log('Параметры запроса:', params.toString()); // Для отладки

    const response = await axios.get(`${API_URL}/api/projects?${params}`);
    
    setProjects(response.data);
    setFilteredProjects(response.data);
    setLoading(false);
  } catch (error) {
    console.error('Ошибка при загрузке проектов:', error);
    setLoading(false);
  }
};

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    fetchProjects(newFilters);
  };

  const handleResetFilters = () => {
    const resetFilters = {
      search: '',
      projectType: '',
      location: '',
      dateFrom: '',
      dateTo: ''
    };
    setFilters(resetFilters);
    fetchProjects(resetFilters);
  };

  const handleApply = async (projectId) => {
    if (!user) {
      alert('Для подачи заявки необходимо войти в систему');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const message = prompt('Напишите сообщение организатору (необязательно):');
      
      await axios.post(
        `${API_URL}/api/projects/${projectId}/applications`,
        { message: message || '' },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      alert('Заявка успешно подана!');
      fetchProjects(); // Обновляем список
    } catch (error) {
      alert(error.response?.data?.error || 'Ошибка при подаче заявки');
    }
  };

  const handleEdit = (project) => {
    setEditingProject(project);
  };

  const handleSaveEdit = async (updatedProject) => {
  try {
    const token = localStorage.getItem('token');
    
    // Подготавливаем данные для отправки
    const dataToSend = {
      title: updatedProject.title,
      description: updatedProject.description,
      status: updatedProject.status,
      startDate: updatedProject.startDate || null,
      endDate: updatedProject.endDate || null,
      location: updatedProject.location || '',
      projectType: updatedProject.projectType || '',
      volunteersRequired: updatedProject.volunteersRequired || 1,
      contactInfo: updatedProject.contactInfo || ''
    };

    console.log('Отправляемые данные:', dataToSend); // Для отладки

    const response = await axios.put(
      `${API_URL}/api/projects/${updatedProject.id}`,
      dataToSend,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    setEditingProject(null);
    
    // Обновляем проект в состоянии
    setProjects(projects.map(project => 
      project.id === updatedProject.id ? response.data : project
    ));
    setFilteredProjects(filteredProjects.map(project => 
      project.id === updatedProject.id ? response.data : project
    ));
    
    alert('Проект успешно обновлен!');
  } catch (error) {
    console.error('Ошибка при обновлении проекта:', error);
    alert(error.response?.data?.error || 'Ошибка при обновлении проекта');
  }
};

  const handleDeleteClick = (project) => {
    setProjectToDelete(project);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${API_URL}/api/projects/${projectToDelete.id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      setShowDeleteModal(false);
      setProjectToDelete(null);
      fetchProjects(); // Обновляем список проектов
      alert('Проект успешно удален!');
    } catch (error) {
      alert(error.response?.data?.error || 'Ошибка при удалении проекта');
    }
  };

  const getProjectTypeLabel = (projectType) => {
    const typeMap = {
      'ECOLOGY': '🌱 Экология',
      'ANIMAL_WELFARE': '🐾 Защита животных',
      'EDUCATION': '📚 Образование',
      'SOCIAL': '❤️ Социальная помощь',
      'CULTURAL': '🎨 Культура',
      'SPORTS': '⚽ Спорт',
      'MEDICAL': '🏥 Медицина',
      'OTHER': '🔧 Другое'
    };
    return typeMap[projectType] || projectType;
  };

  // Функция для отображения статуса
const getStatusText = (status) => {
  const statusMap = {
    'DRAFT': '📝 Черновик',
    'ACTIVE': '🟢 Активный', 
    'COMPLETED': '✅ Завершен',
    'CANCELLED': '🔴 Отменен'
  };
  return statusMap[status] || status;
};

const getStatusClass = (status) => {
  return `status-${status.toLowerCase()}`;
};

  const formatDate = (dateString) => {
    if (!dateString) return 'Не указана';
    return new Date(dateString).toLocaleDateString('ru-RU');
  };
const formatPhoneDisplay = (phone) => {
  if (!phone) return 'Не указано';
  
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 11 && (cleaned.startsWith('7') || cleaned.startsWith('8'))) {
    const match = cleaned.match(/^[78]?(\d{3})(\d{3})(\d{2})(\d{2})$/);
    if (match) {
      return `+7 (${match[1]}) ${match[2]}-${match[3]}-${match[4]}`;
    }
  }
  
  return phone;
};
const handleMessageOrganizer = async (project) => {
  if (!user) {
    alert('Для отправки сообщений необходимо войти в систему');
    return;
  }
  
  console.log('Полные данные проекта:', project);
  
  let organizerInfo = null;
  
  // Вариант 1: используем данные из проекта
  if (project.creator && project.creator.id) {
    organizerInfo = {
      id: project.creator.id,
      firstName: project.creator.firstName,
      lastName: project.creator.lastName,
      role: 'organizer'
    };
    console.log('Организатор из данных проекта:', organizerInfo);
  } 
  // Вариант 2: запрашиваем с сервера
  else {
    try {
      console.log('Запрашиваем информацию об организаторе с сервера...');
      const response = await axios.get(`${API_URL}/api/projects/${project.id}/organizer`);
      organizerInfo = {
        id: response.data.id,
        firstName: response.data.firstName,
        lastName: response.data.lastName,
        role: response.data.role
      };
      console.log('Организатор с сервера:', organizerInfo);
    } catch (error) {
      console.error('Ошибка при получении организатора:', error);
      alert('Не удалось получить информацию об организаторе проекта');
      return;
    }
  }
  
  if (!organizerInfo) {
    alert('Информация об организаторе недоступна');
    return;
  }
  
  // Сохраняем в localStorage
  localStorage.setItem('selectedOrganizer', JSON.stringify(organizerInfo));
  
  // Двойная проверка сохранения
  const saved = localStorage.getItem('selectedOrganizer');
  console.log('Проверка сохранения в localStorage:', saved);
  
  if (!saved) {
    alert('Ошибка при сохранении данных организатора');
    return;
  }
  
  // Переходим в чат
  console.log('Переход в чат...');
  window.location.href = '/chat';
};


  if (loading) {
    return <div className="loading">Загрузка проектов...</div>;
  }

  return (
    <div className="project-list">
      <div className="page-header">
        <h1>Волонтерские проекты</h1>
        <button 
          className="btn btn-primary"
          onClick={() => fetchProjects()}
          disabled={loading}
        >
          🔄 Обновить
        </button>
      </div>

      <ProjectFilters 
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onReset={handleResetFilters}
      />

      <div className="projects-stats">
        Найдено проектов: {filteredProjects.length}
      </div>
      
      <div className="projects-grid">
        {filteredProjects.map(project => (
          <div key={project.id} className="project-card">
            <div className="project-header">
  <div className="project-title-section">
    <h2>{project.title}</h2>
    <span className={`project-status ${getStatusClass(project.status)}`}>
      {getStatusText(project.status)}
    </span>
  </div>
  {project.projectType && (
    <span className="project-type-badge">
      {getProjectTypeLabel(project.projectType)}
    </span>
  )}
</div>
            
            <p>{project.description}</p>
            
            <div className="project-meta">
              <div className="meta-item">
                <strong>📅 Дата начала:</strong>
                <span>{formatDate(project.startDate)}</span>
              </div>
              <div className="meta-item">
                <strong>📍 Местоположение:</strong>
                <span>{project.location || 'Не указано'}</span>
              </div>
              <div className="meta-item">
                <strong>👤 Создатель:</strong>
                <span>{project.creator.firstName} {project.creator.lastName}</span>
              </div>
              <div className="meta-item">
                <strong>👥 Требуется волонтеров:</strong>
                <span>{project.volunteersRequired}</span>
              </div>
              <div className="meta-item">
  <strong>📞 Контакты:</strong>
  <span>
    {project.contactInfo ? 
      (project.contactInfo.includes('@') 
        ? project.contactInfo
        : formatPhoneDisplay(project.contactInfo)
      ) 
      : 'Не указаны'
    }
  </span>
</div>
              <div className="meta-item">
                <strong>📊 Заявки:</strong>
                <span>
                  Всего: {project.applicationsCount} 
                  {project.pendingApplicationsCount > 0 && 
                    `, Новые: ${project.pendingApplicationsCount}`
                  }
                </span>
              </div>
            </div>

           <div className="project-actions">
  {user && user.role === 'volunteer' && (
    <>
      {project.status === 'ACTIVE' ? (
        <>
          {/* Кнопка подачи заявки */}
          <button
            className="btn btn-primary"
            onClick={() => handleApply(project.id)}
          >
            📝 Подать заявку
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => handleMessageOrganizer(project)}
          >
            💬 Написать организатору
          </button>
        </>
      ) : (
        <div className="project-not-available">
          {project.status === 'COMPLETED' 
            ? '✅ Проект завершен' 
            : '❌ Проект отменен'}
          <br />
          <small>Заявки не принимаются</small>
        </div>
      )}
    </>
  )}            
              {user && user.id === project.createdBy && (
                <>
                  <button 
                    className="btn btn-warning"
                    onClick={() => handleEdit(project)}
                  >
                    ✏️ Редактировать
                  </button>
                  <button 
                    className="btn btn-danger"
                    onClick={() => handleDeleteClick(project)}
                  >
                    🗑️ Удалить
                  </button>
                </>
              )}
              
              {user && user.id === project.createdBy && (
                <button 
                  className="btn btn-success"
                  onClick={() => window.location.href = `/project-applications/${project.id}`}
                >
                  👥 Управление заявками 
                  {project.pendingApplicationsCount > 0 && 
                    ` (${project.pendingApplicationsCount} новых)`
                  }
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className="empty-state">
          <h3>Проекты не найдены</h3>
          <p>Попробуйте изменить параметры поиска или сбросить фильтры</p>
          <button 
            className="btn btn-primary"
            onClick={handleResetFilters}
          >
            Сбросить фильтры
          </button>
        </div>
      )}

      {/* Модальное окно подтверждения удаления */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Подтверждение удаления</h2>
              <button 
                className="close-btn"
                onClick={() => setShowDeleteModal(false)}
              >
                ×
              </button>
            </div>
            <p>Вы уверены, что хотите удалить проект "{projectToDelete?.title}"?</p>
            <p>Это действие нельзя отменить.</p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button 
                className="btn btn-danger"
                onClick={handleDeleteConfirm}
              >
                Да, удалить
              </button>
              <button 
                className="btn"
                onClick={() => setShowDeleteModal(false)}
                style={{ backgroundColor: '#6c757d', color: 'white' }}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно редактирования */}
      {editingProject && (
        <EditProjectModal 
          project={editingProject}
          onSave={handleSaveEdit}
          onCancel={() => setEditingProject(null)}
        />
      )}
    </div>
  );
}

// Компонент модального окна редактирования - ИСПРАВЛЕННАЯ ВЕРСИЯ
function EditProjectModal({ project, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    title: project.title,
    description: project.description,
    status: project.status,
    startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
    endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '',
    location: project.location || '',
    projectType: project.projectType || '',
    volunteersRequired: project.volunteersRequired || 1,
    contactInfo: project.contactInfo || ''
  });

  const projectTypes = [
    { value: 'ECOLOGY', label: '🌱 Экология' },
    { value: 'ANIMAL_WELFARE', label: '🐾 Защита животных' },
    { value: 'EDUCATION', label: '📚 Образование' },
    { value: 'SOCIAL', label: '❤️ Социальная помощь' },
    { value: 'CULTURAL', label: '🎨 Культура' },
    { value: 'SPORTS', label: '⚽ Спорт' },
    { value: 'MEDICAL', label: '🏥 Медицина' },
    { value: 'OTHER', label: '🔧 Другое' }
  ];

  const handleSubmit = (e) => {
  e.preventDefault();
  console.log('Данные формы перед отправкой:', formData); // Отладочная информация
  onSave({
    ...project,
    ...formData,
    volunteersRequired: parseInt(formData.volunteersRequired)
  });
};

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Редактировать проект</h2>
          <button className="close-btn" onClick={onCancel}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Название проекта:</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
            />
          </div>

          <div className="form-group">
            <label>Описание:</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows="5"
              style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Тип проекта:</label>
              <select
                name="projectType"
                value={formData.projectType}
                onChange={handleChange}
                style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
              >
                <option value="">Выберите тип</option>
                {projectTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Требуется волонтеров:</label>
              <input
                type="number"
                name="volunteersRequired"
                value={formData.volunteersRequired}
                onChange={handleChange}
                min="1"
                style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Дата начала:</label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
              />
            </div>

            <div className="form-group">
              <label>Дата окончания:</label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Местоположение:</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="Город или адрес..."
              style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
            />
          </div>

          <div className="form-group">
            <label>Контактная информация:</label>
            <input
              type="text"
              name="contactInfo"
              value={formData.contactInfo}
              onChange={handleChange}
              placeholder="Email или телефон..."
              style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
            />
          </div>

          <div className="form-group">
            <label>Статус:</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
            >
              <option value="DRAFT">Черновик</option>
              <option value="ACTIVE">Активный</option>
              <option value="COMPLETED">Завершен</option>
              <option value="CANCELLED">Отменен</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button type="submit" className="btn btn-primary">
              Сохранить
            </button>
            <button
              type="button"
              className="btn"
              onClick={onCancel}
              style={{ backgroundColor: '#6c757d', color: 'white' }}
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProjectList;