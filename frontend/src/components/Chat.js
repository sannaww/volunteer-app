import React, { useState, useEffect, useRef } from 'react';
import api from "../api/client";
import { useNavigate } from 'react-router-dom';
import './Chat.css';

function Chat({ user }) {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchConversations();
  }, [user, navigate]);

  useEffect(() => {
    if (activeConversation) {
      fetchMessages();
      //const interval = setInterval(fetchMessages, 5000);
      //return () => clearInterval(interval);
    }
  }, [activeConversation]);

  // Проверяем localStorage при загрузке компонента
  useEffect(() => {
    const savedOrganizer = localStorage.getItem('selectedOrganizer');
    if (savedOrganizer) {
      const organizer = JSON.parse(savedOrganizer);
      console.log('Найден организатор из localStorage:', organizer);
      handleNewConversation(organizer);
      // Очищаем сразу после использования
      localStorage.removeItem('selectedOrganizer');
    }
  }, []);

  const handleNewConversation = (organizer) => {
    console.log('Обработка нового диалога с:', organizer);
    
    // Ищем существующий диалог
    const existingConversation = conversations.find(
      conv => conv.user.id === organizer.id
    );
    
    if (existingConversation) {
      console.log('Найден существующий диалог');
      setActiveConversation(existingConversation);
    } else {
      console.log('Создаем новый диалог');
      // Создаем временный объект диалога
      const newConversation = {
        user: organizer,
        lastMessage: {
          text: 'Новый диалог',
          createdAt: new Date().toISOString()
        },
        unreadCount: 0,
        isNew: true // Флаг нового диалога
      };
      setActiveConversation(newConversation);
      setMessages([]);
    }
  };

  const fetchConversations = async () => {
  if (!user) return;
  try {
    const response = await api.get("/api/messages/conversations");
    setConversations(response.data);
    setLoading(false);
  } catch (error) {
    console.error("Ошибка при загрузке диалогов:", error);
    setLoading(false);
  }
};

  const fetchMessages = async () => {
  if (!user || !activeConversation) return;

  try {
    const response = await api.get(
      `/api/messages/conversation/${activeConversation.user.id}`
    );
    setMessages(response.data);
    scrollToBottom();
  } catch (error) {
    console.error("Ошибка при загрузке сообщений:", error);
    if (!activeConversation.isNew) {
      console.error("Ошибка загрузки существующего диалога");
    }
  }
};

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSelectConversation = (conversation) => {
    setActiveConversation(conversation);
    setMessages([]);
  };

  const handleSendMessage = async (e) => {
  e.preventDefault();

  if (!newMessage.trim() || !user || !activeConversation) return;

  const receiverId = activeConversation.user.id;

  try {
    const response = await api.post('/api/messages', {
  receiverId,
  text: newMessage.trim()
})

    setMessages((prev) => [...prev, response.data]);
    setNewMessage("");

    await fetchConversations();

    if (activeConversation.isNew) {
      setActiveConversation((prev) => ({ ...prev, isNew: false }));
    }

    scrollToBottom();
  } catch (error) {
    console.error("Ошибка при отправке сообщения:", error);
    alert(
      "Не удалось отправить сообщение: " +
        (error.response?.data?.message ||
          error.response?.data?.error ||
          error.message)
    );
  }
};

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!user) {
    return (
      <div className="chat-error">
        <h3>Требуется авторизация</h3>
        <p>Пожалуйста, войдите в систему для доступа к чату</p>
        <button onClick={() => navigate('/login')} className="btn btn-primary">
          Войти
        </button>
      </div>
    );
  }

  if (loading) {
    return <div className="chat-loading">Загрузка чата...</div>;
  }

  return (
    <div className="chat-container">
      <div className="chat-sidebar">
        <div className="chat-header">
          <h3>Сообщения</h3>
        </div>
        <div className="conversations-list">
          {conversations.length === 0 ? (
            <div className="no-conversations">
              <p>Нет сообщений</p>
            </div>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.user.id}
                className={`conversation-item ${activeConversation?.user.id === conv.user.id ? 'active' : ''}`}
                onClick={() => handleSelectConversation(conv)}
              >
                <div className="conversation-avatar">
                  {conv.user.firstName[0]}{conv.user.lastName[0]}
                </div>
                <div className="conversation-info">
                  <div className="conversation-header">
                    <span className="conversation-name">
                      {conv.user.firstName} {conv.user.lastName}
                    </span>
                    <span className="conversation-time">
                      {formatTime(conv.lastMessage.createdAt)}
                    </span>
                  </div>
                  <div className="conversation-preview">
                    <span className="message-preview">
                      {conv.lastMessage.text.length > 30
                        ? conv.lastMessage.text.substring(0, 30) + '...'
                        : conv.lastMessage.text
                      }
                    </span>
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="unread-badge">{conv.unreadCount}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="chat-main">
        {activeConversation ? (
          <>
            <div className="chat-header">
              <div className="chat-partner-info">
                <h4>
                  {activeConversation.user.firstName} {activeConversation.user.lastName}
                </h4>
                <span className="user-role">
                  {activeConversation.user.role === 'organizer' ? 'Организатор' : 'Волонтер'}
                </span>
                {activeConversation.isNew && (
                  <span className="new-conversation-badge">Новый диалог</span>
                )}
              </div>
            </div>
            <div className="messages-container">
              {messages.length > 0 ? (
                messages.map(message => (
                  <div
                    key={message.id}
                    className={`message ${message.senderId === user.id ? 'sent' : 'received'}`}
                  >
                    <div className="message-content">
                      <p>{message.text}</p>
                      <span className="message-time">
                        {formatTime(message.createdAt)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-messages">
                  <p>{activeConversation.isNew ? 'Начните разговор' : 'Нет сообщений'}</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <form className="message-input-form" onSubmit={handleSendMessage}>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Введите сообщение..."
                className="message-input"
              />
              <button 
                type="submit" 
                className="send-button"
                disabled={!newMessage.trim()}
              >
                Отправить
              </button>
            </form>
          </>
        ) : (
          <div className="no-chat-selected">
            <p>Выберите диалог для начала общения</p>
            <p>Или нажмите "Написать организатору" на странице проекта</p>
          </div>
        )}
      </div>
    </div>  );}
export default Chat;
