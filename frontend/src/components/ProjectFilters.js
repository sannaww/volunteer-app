import React, { useState } from 'react';
import './ProjectFilters.css';

function ProjectFilters({ filters, onFiltersChange, onReset }) {
  const [localFilters, setLocalFilters] = useState({
    search: filters.search || '',
    projectType: filters.projectType || '',
    location: filters.location || '',
    dateFrom: filters.dateFrom || '',
    dateTo: filters.dateTo || '',
    status: filters.status || '' // Добавляем статус в фильтры
  });

  const [showFilters, setShowFilters] = useState(false);

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

  // Добавляем опции для статусов
  const statusOptions = [
    { value: '', label: 'Все статусы' },
    { value: 'ACTIVE', label: '🔵 Активные' },
    { value: 'COMPLETED', label: '✅ Завершенные' },
    { value: 'CANCELLED', label: '❌ Отмененные' }
  ];

  const handleFilterChange = (key, value) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
  };

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
  };

  const handleReset = () => {
    const resetFilters = {
      search: '',
      projectType: '',
      location: '',
      dateFrom: '',
      dateTo: '',
      status: '' // Добавляем сброс статуса
    };
    setLocalFilters(resetFilters);
    onReset();
  };

  return (
    <div className="project-filters">
      <div className="filters-header">
        <div className="search-box">
          <input
            type="text"
            placeholder="Поиск по названию или описанию..."
            value={localFilters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleApplyFilters()}
          />
          <button
            className="search-btn"
            onClick={handleApplyFilters}
          >
            🔍
          </button>
        </div>       
        
        <button
          className="toggle-filters-btn"
          onClick={() => setShowFilters(!showFilters)}
        >
          {showFilters ? '▲ Скрыть фильтры' : '▼ Расширенные фильтры'}
        </button>
      </div>

      {showFilters && (
        <div className="filters-panel">
          <div className="filters-grid">
            {/* Добавляем фильтр по статусу */}
            <div className="filter-group">
              <label>Статус:</label>
              <select
                value={localFilters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Тип проекта:</label>
              <select
                value={localFilters.projectType}
                onChange={(e) => handleFilterChange('projectType', e.target.value)}
              >
                <option value="">Все типы</option>
                {projectTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Местоположение:</label>
              <input
                type="text"
                placeholder="Город или адрес..."
                value={localFilters.location}
                onChange={(e) => handleFilterChange('location', e.target.value)}
              />
            </div>

            <div className="filter-group">
              <label>Дата с:</label>
              <input
                type="date"
                value={localFilters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />
            </div>

            <div className="filter-group">
              <label>Дата по:</label>
              <input
                type="date"
                value={localFilters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              />
            </div>
          </div>

          <div className="filter-actions">
            <button
              className="btn btn-primary"
              onClick={handleApplyFilters}
            >
              Применить фильтры
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleReset}
            >
              Сбросить
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectFilters;