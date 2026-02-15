import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import api from "../api/client";
import { createSocket } from "../api/socket";

import "./Chat.css";

function Chat({ user }) {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  // refs to avoid stale closures inside socket callbacks
  const userRef = useRef(user);
  const activeConvRef = useRef(activeConversation);

  const navigate = useNavigate();

  // keep refs up-to-date
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    activeConvRef.current = activeConversation;
  }, [activeConversation]);

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

  const addMessageIfNotExists = (msg) => {
    setMessages((prev) => {
      if (!msg?.id) return [...prev, msg];
      if (prev.some((m) => m?.id === msg.id)) return prev;
      return [...prev, msg];
    });
  };

  // -------- data loading --------
  const fetchConversations = async () => {
    const currentUser = userRef.current;
    if (!currentUser) return;

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
    const currentUser = userRef.current;
    const conv = activeConvRef.current;

    if (!currentUser || !conv?.user?.id) return;

    try {
      const response = await api.get(`/api/messages/conversation/${conv.user.id}`);
      setMessages(response.data || []);
      // небольшой таймаут, чтобы DOM успел отрендериться
      setTimeout(scrollToBottom, 0);
    } catch (error) {
      console.error("Ошибка при загрузке сообщений:", error);
      // если новый диалог — отсутствие сообщений ок
      if (!conv?.isNew) {
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

  // -------- Socket.IO connect (once) --------
  useEffect(() => {
    const s = createSocket();
    socketRef.current = s;

    s.on("connect", () => console.log("WS connected", s.id));
    s.on("connect_error", (e) => console.log("WS connect_error:", e.message));

    // Получили новое сообщение
    s.on("message:new", (msg) => {
      const currentUser = userRef.current;
      const conv = activeConvRef.current;

      // обновим список диалогов (lastMessage/сортировка)
      fetchConversations();

      // если диалог не выбран — просто обновили список и выходим
      if (!conv?.user?.id || !currentUser?.id) return;

      const partnerId = conv.user.id;

      const isForThisChat =
        (msg.senderId === partnerId && msg.receiverId === currentUser.id) ||
        (msg.senderId === currentUser.id && msg.receiverId === partnerId);

      if (isForThisChat) {
        addMessageIfNotExists(msg);
        setTimeout(scrollToBottom, 0);
      }
    });

    // Подтверждение отправки нашего сообщения (и сохранения в БД)
    s.on("message:sent", (msg) => {
      addMessageIfNotExists(msg);

      fetchConversations();

      // если это был новый диалог — снимаем флаг
      const conv = activeConvRef.current;
      if (conv?.isNew) {
        setActiveConversation((prev) => ({ ...prev, isNew: false }));
      }

      setTimeout(scrollToBottom, 0);
    });

    s.on("message:error", (e) => {
      console.log("WS message:error", e);
      alert("Не удалось отправить сообщение: " + (e?.error || "WS error"));
    });

    return () => {
      s.disconnect();
    };
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
    const text = newMessage.trim();

    try {
      const socket = socketRef.current;

      // Если WS подключен — отправляем через WS
      if (socket && socket.connected) {
        socket.emit("message:send", { receiverId, text });
        setNewMessage("");
        return;
      }

      // Фоллбэк: если WS временно не подключён — отправим по HTTP
      const response = await api.post("/api/messages", { receiverId, text });

      addMessageIfNotExists(response.data);
      setNewMessage("");

      await fetchConversations();

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
                <div className="conversation-avatar">{initials(conv.user)}</div>

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
                  <p>{activeConversation.isNew ? "Начните разговор" : "Нет сообщений"}</p>
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