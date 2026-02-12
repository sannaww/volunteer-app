import React, { useState, useEffect, useRef } from "react";
import api from "../api/client";
import { useNavigate } from "react-router-dom";
import "./Chat.css";

function Chat({ user }) {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  // -------- helpers (UI-safe) --------
  const displayName = (u) => {
    if (!u) return "Пользователь";
    if (u.firstName && u.lastName) return `${u.firstName} ${u.lastName}`;
    if (u.firstName) return u.firstName;
    if (u.lastName) return u.lastName;
    if (u.id != null) return `Пользователь #${u.id}`;
    return "Пользователь";
  };

  const displayRole = (role) => {
    if (role === "organizer") return "Организатор";
    if (role === "volunteer") return "Волонтер";
    if (role === "admin") return "Администратор";
    return "Пользователь";
  };

  const initials = (u) => {
    const first = u?.firstName?.trim()?.[0];
    const last = u?.lastName?.trim()?.[0];
    if (first && last) return `${first}${last}`;
    if (first) return first;
    if (last) return last;
    return "?";
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // -------- data loading --------
  const fetchConversations = async () => {
    if (!user) return;
    try {
      const response = await api.get("/api/messages/conversations");
      setConversations(response.data || []);
    } catch (error) {
      console.error("Ошибка при загрузке диалогов:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!user || !activeConversation?.user?.id) return;

    try {
      const response = await api.get(
        `/api/messages/conversation/${activeConversation.user.id}`
      );
      setMessages(response.data || []);
      scrollToBottom();
    } catch (error) {
      console.error("Ошибка при загрузке сообщений:", error);
      // если новый диалог — отсутствие сообщений ок
      if (!activeConversation?.isNew) {
        console.error("Ошибка загрузки существующего диалога");
      }
    }
  };

  // -------- lifecycle --------
  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    fetchConversations();

  }, [user, navigate]);

  useEffect(() => {
    if (activeConversation) {
      fetchMessages();
    }

  }, [activeConversation]);

  // Получаем organizer из localStorage (переход из карточки проекта)
  useEffect(() => {
    const savedOrganizer = localStorage.getItem("selectedOrganizer");
    if (!savedOrganizer) return;

    try {
      const organizer = JSON.parse(savedOrganizer);
      handleNewConversation(organizer);
    } catch (e) {
      console.error("Не удалось прочитать selectedOrganizer:", e);
    } finally {
      localStorage.removeItem("selectedOrganizer");
    }

  }, []);

  // -------- conversation actions --------
  const handleSelectConversation = (conversation) => {
    setActiveConversation(conversation);
    setMessages([]);
  };

  const handleNewConversation = (organizer) => {
    // organizer должен быть объектом пользователя: { id, firstName, lastName, role }
    if (!organizer?.id) return;

    const existingConversation = conversations.find(
      (conv) => conv?.user?.id === organizer.id
    );

    if (existingConversation) {
      setActiveConversation(existingConversation);
      return;
    }

    // Создаем временный объект диалога
    const newConversation = {
      user: {
        id: organizer.id,
        firstName: organizer.firstName ?? null,
        lastName: organizer.lastName ?? null,
        role: organizer.role ?? "organizer",
      },
      lastMessage: {
        text: "Новый диалог",
        createdAt: new Date().toISOString(),
      },
      unreadCount: 0,
      isNew: true,
    };

    setActiveConversation(newConversation);
    setMessages([]);
  };

  // -------- send message --------
  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim() || !user || !activeConversation?.user?.id) return;

    const receiverId = activeConversation.user.id;

    try {
      const response = await api.post("/api/messages", {
        receiverId,
        text: newMessage.trim(),
      });

      // добавляем отправленное сообщение локально
      setMessages((prev) => [...prev, response.data]);
      setNewMessage("");

      // обновляем список диалогов (чтобы lastMessage подтянулся)
      await fetchConversations();

      // если это был новый диалог — снимаем флаг
      if (activeConversation?.isNew) {
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

  // -------- guards / states --------
  if (!user) {
    return (
      <div className="chat-error">
        <h3>Требуется авторизация</h3>
        <p>Пожалуйста, войдите в систему для доступа к чату</p>
        <button
          onClick={() => navigate("/login")}
          className="btn btn-primary"
          type="button"
        >
          Войти
        </button>
      </div>
    );
  }

  if (loading) {
    return <div className="chat-loading">Загрузка чата...</div>;
  }

  // -------- render --------
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
            conversations.map((conv) => (
              <div
                key={conv.user.id}
                className={`conversation-item ${
                  activeConversation?.user?.id === conv.user.id ? "active" : ""
                }`}
                onClick={() => handleSelectConversation(conv)}
                role="button"
                tabIndex={0}
              >
                <div className="conversation-avatar">
                  {initials(conv.user)}
                </div>

                <div className="conversation-info">
                  <div className="conversation-header">
                    <span className="conversation-name">
                      {displayName(conv.user)}
                    </span>

                    <span className="conversation-time">
                      {conv?.lastMessage?.createdAt
                        ? formatTime(conv.lastMessage.createdAt)
                        : ""}
                    </span>
                  </div>

                  <div className="conversation-preview">
                    <span className="message-preview">
                      {conv?.lastMessage?.text
                        ? conv.lastMessage.text.length > 30
                          ? conv.lastMessage.text.substring(0, 30) + "..."
                          : conv.lastMessage.text
                        : ""}
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
                <h4>{displayName(activeConversation.user)}</h4>

                <span className="user-role">
                  {displayRole(activeConversation.user?.role)}
                </span>

                {activeConversation.isNew && (
                  <span className="new-conversation-badge">Новый диалог</span>
                )}
              </div>
            </div>

            <div className="messages-container">
              {messages.length > 0 ? (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`message ${
                      message.senderId === user.id ? "sent" : "received"
                    }`}
                  >
                    <div className="message-content">
                      <p>{message.text}</p>
                      <span className="message-time">
                        {message.createdAt ? formatTime(message.createdAt) : ""}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-messages">
                  <p>
                    {activeConversation.isNew ? "Начните разговор" : "Нет сообщений"}
                  </p>
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
            <p>Или нажмите “Написать организатору” на странице проекта</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Chat;
