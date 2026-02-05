import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Profile.css';
import OrganizerStats from './OrganizerStats';
import DraftProjects from './DraftProjects';

function Profile({ user }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState(null);
  const [participationHistory, setParticipationHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Используем данные из user, которые уже есть после логина
  useEffect(() => {
  const fetchUserProfile = async () => {
    if (user) {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Загружаем актуальные данные пользователя из базы
        const response = await axios.get('http://localhost:5000/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const userData = response.data;
        console.log('📥 Загружен профиль из базы:', userData);

        const userProfile = {
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          role: userData.role,
          phone: userData.phone || '',
          skills: userData.skills || '',
          interests: userData.interests || '',
          bio: userData.bio || '',
          createdAt: userData.createdAt
        };

        setProfile(userProfile);
        setFormData(userProfile);

        // Обновляем данные в localStorage
        localStorage.setItem('user', JSON.stringify(userData));

      } catch (error) {
        console.error('Ошибка при загрузке профиля:', error);
        // Если не удалось загрузить из базы, используем данные из localStorage
        const userProfile = {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          phone: user.phone || '',
          skills: user.skills || '',
          interests: user.interests || '',
          bio: user.bio || '',
          createdAt: user.createdAt || new Date().toISOString()
        };
        setProfile(userProfile);
        setFormData(userProfile);
      }
    }
  };

  fetchUserProfile();
}, [user]);
  useEffect(() => {
    if (user && activeTab === 'history') {
      fetchParticipationHistory();
    }
  }, [activeTab, user]);

  const fetchParticipationHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await axios.get('http://localhost:5000/api/profile/participation-history', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setParticipationHistory(response.data);
    } catch (error) {
      console.error('Ошибка при загрузке истории участия:', error);
    }
  };

 const handleSaveProfile = async (e) => {
  e.preventDefault();
  
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Требуется авторизация');
      return;
    }

    const response = await axios.put('http://localhost:5000/api/profile', {
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone,
      skills: formData.skills,
      interests: formData.interests,
      bio: formData.bio
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ Ответ от сервера:', response.data);

    // ОБНОВЛЯЕМ ВСЕ ПОЛЯ В LOCALSTORAGE
    const updatedUser = {
      ...user,
      firstName: response.data.firstName,
      lastName: response.data.lastName,
      phone: response.data.phone,
      skills: response.data.skills,
      interests: response.data.interests,
      bio: response.data.bio
    };

    localStorage.setItem('user', JSON.stringify(updatedUser));
    
    // ОБНОВЛЯЕМ СОСТОЯНИЕ ПРОФИЛЯ
    setProfile(response.data);
    console.log('🔄 profile после обновления:', profile);
console.log('🔄 Навыки в profile после обновления:', profile.skills);
    setEditing(false);
    
    alert('Профиль успешно обновлен!');

  } catch (error) {
    console.error('❌ Ошибка при обновлении профиля:', error);
    alert('Ошибка при обновлении профиля: ' + error.message);
  }
};

const handleInputChange = (e) => {
  const { name, value } = e.target;
  /*console.log(`🔍 Поле "${name}" изменяется на: "${value}"`);*/
  
  // ТОЛЬКО для телефона применяем специальную логику
  if (name === 'phone') {
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
    
    setFormData(prevFormData => ({
      ...prevFormData,
      [name]: cleanedValue
    }));
  } else {
    // Для ВСЕХ остальных полей (навыки, интересы, bio) - просто сохраняем значение
    setFormData(prevFormData => ({
      ...prevFormData,
      [name]: value
    }));
  }
  /*console.log('📊 formData после изменения:', formData);*/
};

  const handleDeleteAccount = async () => {
    if (!window.confirm('Вы уверены, что хотите удалить аккаунт? Это действие нельзя отменить. Все ваши проекты и заявки будут удалены.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete('http://localhost:5000/api/auth/account', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      alert('Аккаунт успешно удален');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    } catch (error) {
      console.error('Ошибка при удалении аккаунта:', error);
      alert(error.response?.data?.error || 'Не удалось удалить аккаунт');
    }
  };

  const generateCertificate = (project) => {
    if (!profile) {
      alert('Не удалось создать сертификат: данные профиля не загружены');
      return;
    }

    const certificateText = `
      СЕРТИФИКАТ ВОЛОНТЕРА
      Настоящим подтверждается, что
      ${profile.firstName} ${profile.lastName}
      принял(а) участие в проекте:
      "${project.project.title}"
      Дата участия: ${new Date(project.createdAt).toLocaleDateString('ru-RU')}
      Организатор: ${project.project.creator.firstName} ${project.project.creator.lastName}
      Благодарим за ваш вклад!  `;

    const blob = new Blob([certificateText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `сертификат_${project.project.title.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
const formatPhoneDisplay = (phone) => {
  if (!phone) return 'Не указан';
  
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 11 && (cleaned.startsWith('7') || cleaned.startsWith('8'))) {
    const match = cleaned.match(/^[78]?(\d{3})(\d{3})(\d{2})(\d{2})$/);
    if (match) {
      return `+7 (${match[1]}) ${match[2]}-${match[3]}-${match[4]}`;
    }
  }
  
  return phone;
};

// В функции, которая включает редактирование:
const handleEditStart = () => {
  console.log('🔍 Данные профиля перед редактированием:', profile);
  console.log('🔍 formData перед редактированием:', formData);
  setEditing(true);
  // Убедитесь, что formData содержит актуальные данные профиля
  setFormData({
    firstName: profile.firstName || '',
    lastName: profile.lastName || '',
    phone: profile.phone || '',
    skills: profile.skills || '',
    interests: profile.interests || '',
    bio: profile.bio || ''
  });
};
  if (!user) {
    return (
      <div className="error-container">
        <div className="error">
          <h2>Ошибка загрузки</h2>
          <p>Пользователь не авторизован</p>
          <div className="error-actions">
            <button
              onClick={() => window.location.href = '/login'}
              className="btn btn-primary"
            >
              Войти
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <div className="loading">Подготовка профиля...</div>;
  }

  return (
    <div className="profile">
      <div className="profile-header">
        <h1>Личный кабинет</h1>
      </div>

      <div className="profile-tabs-container">
        <div className="profile-tabs">
          <button
            className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            📝 Профиль
          </button>
          <button
            className={`tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            📊 История участия
          </button>
          <button
            className={`tab ${activeTab === 'applications' ? 'active' : ''}`}
            onClick={() => setActiveTab('applications')}
          >
            📨 Мои заявки
          </button>
          {user && user.role === 'organizer' && (
            <button
              className={`tab ${activeTab === 'stats' ? 'active' : ''}`}
              onClick={() => setActiveTab('stats')}
            >
              📊 Статистика
            </button>
          )}
          {user && user.role === 'organizer' && (
            <button
              className={`tab ${activeTab === 'drafts' ? 'active' : ''}`}
              onClick={() => setActiveTab('drafts')}
            >
              📋 Черновики
            </button>
          )}
        </div>
      </div>

      <div className="profile-content">
        {activeTab === 'profile' && (
          <div className="profile-section">
            <div className="section-header">
              <h2>Личная информация</h2>
              {!editing ? (
                <button
                  className="btn btn-primary"
                  onClick={handleEditStart} 
                >
                  ✏️ Редактировать
                </button>
              ) : (
                <div className="edit-actions">
                  <button
                    className="btn btn-success"
                    onClick={handleSaveProfile}
                  >
                    💾 Сохранить
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setEditing(false);
                      setFormData(profile);
                    }}
                  >
                    ❌ Отмена
                  </button>
                </div>
              )}
            </div>

            {editing ? (
              <form className="profile-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Имя:</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName || ''}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Фамилия:</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName || ''}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Email:</label>
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="disabled-input"
                  />
                  <small>Email нельзя изменить</small>
                </div>
                <div className="form-group">
                <label>Телефон:</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone || ''}
                  onChange={handleInputChange}
                  placeholder="+7 (XXX) XXX-XX-XX"
                  pattern="^\+7\d{10}$"
                  maxLength="12"
                />
                <small>Формат: +79991234567</small>
              </div>
                <div className="form-group">
                  <label>Навыки:</label>
                  <input
                    type="text"
                    name="skills"
                    value={formData.skills || ''}
                    onChange={(e) => {
                      console.log('📝 Навыки изменяются на:', e.target.value);
                      setFormData(prev => ({ ...prev, skills: e.target.value }));
                    }}
                    placeholder="Перечислите ваши навыки через запятую"
                  />
                </div>
                <div className="form-group">
                  <label>Интересы:</label>
                  <textarea
                    name="interests"
                    value={formData.interests || ''}
                    onChange={handleInputChange}
                    placeholder="Перечислите ваши интересы через запятую"
                    rows="3"
                  />
                </div>
                <div className="form-group">
                  <label>О себе:</label>
                  <textarea
                    name="bio"
                    value={formData.bio || ''}
                    onChange={handleInputChange}
                    placeholder="Расскажите о себе, своем опыте волонтерства"
                    rows="4"
                  />
                </div>
              </form>
            ) : (
              <div className="profile-info">
                <div className="info-grid">
                  <div className="info-item">
                    <strong>Имя:</strong>
                    <span>{profile.firstName} {profile.lastName}</span>
                  </div>
                  <div className="info-item">
                    <strong>Email:</strong>
                    <span>{profile.email}</span>
                  </div>
                  <div className="info-item">
                    <strong>Телефон:</strong>
                    <span>{formatPhoneDisplay(profile.phone)}</span>
                  </div>
                  <div className="info-item">
                    <strong>Навыки:</strong>
                    <span>{profile.skills || 'Не указаны'}</span>
                  </div>
                  <div className="info-item">
                    <strong>Интересы:</strong>
                    <span>{profile.interests || 'Не указаны'}</span>
                  </div>
                  <div className="info-item full-width">
                    <strong>О себе:</strong>
                    <span>{profile.bio || 'Не указано'}</span>
                  </div>
                  <div className="info-item">
                    <strong>Дата регистрации:</strong>
                    <span>{profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('ru-RU') : 'Неизвестно'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Секция удаления аккаунта - ТОЛЬКО в профиле */}
            <div className="account-deletion-section">
              <div className="danger-zone">
                <button
                  className="btn btn-danger"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  🗑️ Удалить аккаунт
                </button>
              </div>
            </div>

            {/* Модальное окно подтверждения - ТОЛЬКО в профиле */}
            {showDeleteConfirm && (
              <div className="modal-overlay">
                <div className="modal-content">
                  <div className="modal-header">
                    <h2>Подтверждение удаления аккаунта</h2>
                    <button
                      className="close-btn"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className="delete-warning">
                    <div className="warning-icon">⚠️</div>
                    <h3>Внимание! Это действие необратимо</h3>
                    <p>При удалении аккаунта будут безвозвратно удалены:</p>
                    <ul>
                      <li>✅ Все ваши личные данные</li>
                      <li>✅ Все созданные вами проекты</li>
                      <li>✅ Все поданные заявки</li>
                      <li>✅ Вся история участия</li>
                    </ul>
                    <p><strong>Вы уверены, что хотите продолжить?</strong></p>
                  </div>

                  <div className="modal-actions">
                    <button
                      className="btn btn-danger"
                      onClick={handleDeleteAccount}
                    >
                      Да, удалить аккаунт
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="profile-section">
            <h2>История участия</h2>
            {participationHistory.length === 0 ? (
              <div className="empty-state">
                <p>У вас пока нет завершенных проектов</p>
                <p>Подавайте заявки на проекты и участвуйте в волонтерской деятельности!</p>
              </div>
            ) : (
              <div className="history-list">
                {participationHistory.map(participation => (
                  <div key={participation.id} className="history-item">
                    <div className="history-content">
                      <h3>{participation.project.title}</h3>
                      <p>{participation.project.description}</p>
                      <div className="history-meta">
                        <span>Организатор: {participation.project.creator.firstName} {participation.project.creator.lastName}</span>
                        <span>Дата участия: {new Date(participation.createdAt).toLocaleDateString('ru-RU')}</span>
                      </div>
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={() => generateCertificate(participation)}
                    >
                      📄 Скачать сертификат
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'applications' && (
          <div className="profile-section">
            <h2>Мои заявки</h2>
            <p>Для просмотра и управления вашими заявками перейдите в раздел "Мои заявки".</p>
            <button
              className="btn btn-primary"
              onClick={() => window.location.href = '/my-applications'}
            >
              📨 Перейти к моим заявкам
            </button>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="profile-section">
            <OrganizerStats user={user} />
          </div>
        )}

        {activeTab === 'drafts' && (
          <div className="profile-section">
            <DraftProjects user={user} />
          </div>
        )}
      </div>
    </div>
  );
}

export default Profile;