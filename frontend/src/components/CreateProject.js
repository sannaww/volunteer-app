import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './CreateProject.css';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

function CreateProject({ user }) {
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

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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

  // Если пользователь не авторизован, перенаправляем на страницу входа
  if (!user) {
    navigate('/login');
    return null;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

const handleContactInfoChange = (e) => {
  const { value } = e.target;
  
  // Проверяем, если это похоже на телефон
  if (value.includes('@')) {
    // Это email, оставляем как есть
    setFormData(prevState => ({
      ...prevState,
      contactInfo: value
    }));
  } else {
    // Это телефон, применяем маску
    let cleanedValue = value.replace(/[^\d+]/g, '');
    
    if (cleanedValue.startsWith('8')) {
      cleanedValue = '+7' + cleanedValue.substring(1);
    } else if (cleanedValue.startsWith('7') && !cleanedValue.startsWith('+7')) {
      cleanedValue = '+7' + cleanedValue.substring(1);
    } else if (!cleanedValue.startsWith('+')) {
      cleanedValue = '+7' + cleanedValue;
    }
    
    if (cleanedValue.length > 12) {
      cleanedValue = cleanedValue.substring(0, 12);
    }
    
    setFormData(prevState => ({
      ...prevState,
      contactInfo: cleanedValue
    }));
  }
};

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      
      // Подготавливаем данные для отправки
      const dataToSend = {
        ...formData,
        volunteersRequired: parseInt(formData.volunteersRequired),
        // Преобразуем пустые строки в null для дат
        startDate: formData.startDate || null,
        endDate: formData.endDate || null
      };

      console.log('Отправляемые данные:', dataToSend);

      const response = await axios.post('${API_URL}/api/projects', dataToSend, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      alert('Проект успешно создан!');
      navigate('/');
    } catch (error) {
      console.error('Ошибка при создании проекта:', error);
      alert(error.response?.data?.error || 'Не удалось создать проект');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-project">
      <h2>Создать новый проект</h2>
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
    onChange={handleContactInfoChange}
    placeholder="Email или телефон (+79991234567)"
    required
  />
  <small>Укажите email или телефон для связи</small>
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
          </select>
          <small>
            {formData.status === 'DRAFT' 
              ? 'Проект будет сохранен как черновик и не будет виден другим пользователям'
              : 'Проект будет сразу опубликован и станет доступен для просмотра'
            }
          </small>
        </div>

        <button 
          type="submit" 
          className="submit-btn"
          disabled={loading}
        >
          {loading ? 'Создание...' : 'Создать проект'}
        </button>
      </form>
    </div>
  );
}

export default CreateProject;