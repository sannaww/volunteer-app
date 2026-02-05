import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ProjectHistory.css';

function ProjectHistory({ user }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // ALL, COMPLETED, CANCELLED

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/projects?status=COMPLETED,CANCELLED');
      setProjects(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Ошибка при загрузке истории:', error);
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter(project => {
    if (filter === 'ALL') return true;
    return project.status === filter;
  });

  const getStatusText = (status) => {
    const statusMap = {
      'COMPLETED': '✅ Завершен',
      'CANCELLED': '❌ Отменен'
    };
    return statusMap[status] || status;
  };

  if (loading) return <div className="loading">Загрузка истории...</div>;

  return (
    <div className="project-history">
      <div className="history-filters">
        <button 
          className={`filter-btn ${filter === 'ALL' ? 'active' : ''}`}
          onClick={() => setFilter('ALL')}
        >
          Все
        </button>
        <button 
          className={`filter-btn ${filter === 'COMPLETED' ? 'active' : ''}`}
          onClick={() => setFilter('COMPLETED')}
        >
          Завершенные
        </button>
        <button 
          className={`filter-btn ${filter === 'CANCELLED' ? 'active' : ''}`}
          onClick={() => setFilter('CANCELLED')}
        >
          Отмененные
        </button>
      </div>

      <div className="history-list">
        {filteredProjects.length === 0 ? (
          <div className="empty-state">
            <p>Нет мероприятий в истории</p>
          </div>
        ) : (
          filteredProjects.map(project => (
            <div key={project.id} className="history-item">
              <div className="history-content">
                <h3>{project.title}</h3>
                <p>{project.description}</p>
                <div className="history-meta">
                  <span className={`status status-${project.status.toLowerCase()}`}>
                    {getStatusText(project.status)}
                  </span>
                  <span>Организатор: {project.creator.firstName} {project.creator.lastName}</span>
                  <span>Дата: {project.startDate ? new Date(project.startDate).toLocaleDateString() : 'Не указана'}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ProjectHistory;