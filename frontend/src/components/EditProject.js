import React, { useState, useEffect } from 'react';
import api from "../api/client";
import { useParams, useNavigate } from 'react-router-dom';
import './CreateProject.css'; // Используем те же стили

function EditProject({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'DRAFT',
    startDate: '',
    endDate: '',
    location: '',
    projectType: '',
    volunteersRequired: 1,
    contactInfo: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  useEffect(() => {
    fetchProject();
  }, [id]);

  const fetchProject = async () => {
    try {
      const response = await api.get(`/api/projects/${id}`);

      const project = response.data;
      setFormData({
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
      setLoading(false);
    } catch (error) {
      console.error('Ошибка при загрузке проекта:', error);
      alert('Не удалось загрузить проект');
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const dataToSend = {
        ...formData,
        volunteersRequired: parseInt(formData.volunteersRequired),
        startDate: formData.startDate || null,
        endDate: formData.endDate || null
      };

      await api.put(`/api/projects/${id}`, dataToSend);

      alert('Проект успешно обновлен!');
      navigate('/profile'); // Возвращаемся в профиль
    } catch (error) {
      console.error('Ошибка при обновлении проекта:', error);
      alert(error.response?.data?.error || 'Не удалось обновить проект');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">Загрузка проекта...</div>;
  }

  return (
    <div className="create-project">
      <h2>Редактировать проект</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Название проекта:*</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Описание:*</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            rows="5"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Тип проекта:</label>
            <select
              name="projectType"
              value={formData.projectType}
              onChange={handleChange}
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
            <label>Требуется волонтеров:*</label>
            <input
              type="number"
              name="volunteersRequired"
              value={formData.volunteersRequired}
              onChange={handleChange}
              min="1"
              required
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
            />
          </div>

          <div className="form-group">
            <label>Дата окончания:</label>
            <input
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
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
          />
        </div>

        <div className="form-group">
          <label>Контактная информация:*</label>
          <input
            type="text"
            name="contactInfo"
            value={formData.contactInfo}
            onChange={handleChange}
            placeholder="Email или телефон..."
            required
          />
        </div>

        <div className="form-group">
          <label>Статус:*</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            required
          >
            <option value="DRAFT">Черновик</option>
            <option value="ACTIVE">Активный</option>
            <option value="COMPLETED">Завершен</option>
            <option value="CANCELLED">Отменен</option>
          </select>
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="submit-btn"
            disabled={saving}
          >
            {saving ? 'Сохранение...' : 'Сохранить изменения'}
          </button>
          <button
            type="button"
            className="cancel-btn"
            onClick={() => navigate('/profile')}
          >
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
}

export default EditProject;
