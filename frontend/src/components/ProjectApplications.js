import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import './ProjectApplications.css';

function ProjectApplications({ user }) {
  const { projectId } = useParams();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const getStatusText = (status) => {
    switch (status) {
      case 'PENDING': return '⏳ На рассмотрении';
      case 'APPROVED': return '✅ Одобрена';
      case 'REJECTED': return '❌ Отклонена';
      default: return status;
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [projectId]);

  const fetchApplications = async () => {
    try {
      const token = sessionStorage.getItem('token');

      const response = await axios.get(
        `http://localhost:5000/api/applications/project/${projectId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setApplications(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Ошибка при загрузке заявок:', error);
      alert(error.response?.data?.error || 'Ошибка при загрузке заявок');
      setLoading(false);
    }
  };

  const handleApprove = async (applicationId) => {
    try {
      const token = sessionStorage.getItem('token');

      await axios.patch(
        `http://localhost:5000/api/applications/${applicationId}/approve`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      fetchApplications();
    } catch (error) {
      alert(error.response?.data?.error || 'Ошибка при одобрении заявки');
    }
  };

  const handleReject = async (applicationId) => {
    try {
      const token = sessionStorage.getItem('token');

      await axios.patch(
        `http://localhost:5000/api/applications/${applicationId}/reject`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      fetchApplications();
    } catch (error) {
      alert(error.response?.data?.error || 'Ошибка при отклонении заявки');
    }
  };

  if (loading) {
    return <div className="loading">Загрузка заявок...</div>;
  }

  return (
    <div className="project-applications">
      <h1>Заявки на проект</h1>

      {applications.length === 0 ? (
        <p>Пока нет заявок</p>
      ) : (
        <div className="applications-list">
          {applications.map(app => (
            <div key={app.id} className="application-card">
              <div className="application-header">
                <h3>{app.user.firstName} {app.user.lastName}</h3>
                <span className={`status status-${app.status.toLowerCase()}`}>
                  {getStatusText(app.status)}
                </span>
              </div>

              <p><strong>Email:</strong> {app.user.email}</p>
              {app.message && <p><strong>Сообщение:</strong> {app.message}</p>}
              <p><strong>Дата:</strong> {new Date(app.createdAt).toLocaleString()}</p>

              {app.status === 'PENDING' && (
                <div className="application-actions">
                  <button className="btn-approve" onClick={() => handleApprove(app.id)}>
                    Одобрить
                  </button>
                  <button className="btn-reject" onClick={() => handleReject(app.id)}>
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
