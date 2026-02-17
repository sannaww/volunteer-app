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

  // pagination state
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const socketRef = useRef(null);

  // refs to avoid stale closures in socket callbacks
  const userRef = useRef(user);
  const activeConvRef = useRef(activeConversation);

  const navigate = useNavigate();

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    activeConvRef.current = activeConversation;
  }, [activeConversation]);

  // -------- helpers --------
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

  const updateMessageStatus = (messageId, patch) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, ...patch } : m))
    );
  };

  const updateManyMessageStatus = (ids, patch) => {
    const setIds = new Set(ids || []);
    setMessages((prev) =>
      prev.map((m) => (setIds.has(m.id) ? { ...m, ...patch } : m))
    );
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

  /**
   * initial load: last 50
   * ВАЖНО: backend может возвращать:
   * 1) { items, hasMore, nextCursor }  (пагинация)
   * 2) [ ...messages ]                (старый формат без пагинации)
   */
  const fetchMessages = async (conv) => {
    const currentUser = userRef.current;
    if (!currentUser || !conv?.user?.id) return;

    try {
      const response = await api.get(
        `/api/messages/conversation/${conv.user.id}?limit=50`
      );

      const data = response.data;

      // ✅ поддерживаем оба формата ответа
      const items = Array.isArray(data) ? data : data?.items || [];

      setMessages(items);

      // пагинация только если сервер отдает объект
      setHasMore(!Array.isArray(data) && Boolean(data?.hasMore));
      setNextCursor(!Array.isArray(data) ? data?.nextCursor || null : null);

      setTimeout(scrollToBottom, 0);
    } catch (error) {
      console.error("Ошибка при загрузке сообщений:", error);
    }
  };

  // load older messages (prepend) using nextCursor
  const loadMoreMessages = async () => {
    const conv = activeConversation;
    if (!conv?.user?.id) return;
    if (!hasMore || !nextCursor || loadingMore) return;

    const container = messagesContainerRef.current;
    if (!container) return;

    try {
      setLoadingMore(true);

      // запоминаем высоту и позицию до подгрузки
      const prevScrollHeight = container.scrollHeight;
      const prevScrollTop = container.scrollTop;

      const response = await api.get(
        `/api/messages/conversation/${conv.user.id}?cursor=${nextCursor}&limit=50`
      );

      const data = response.data;

      // ✅ поддерживаем оба формата ответа
      const items = Array.isArray(data) ? data : data?.items || [];

      if (items.length) {
        setMessages((prev) => [...items, ...prev]);
      }

      setHasMore(!Array.isArray(data) && Boolean(data?.hasMore));
      setNextCursor(!Array.isArray(data) ? data?.nextCursor || null : null);

      // сохраняем "визуальную" позицию: не прыгаем вниз
      setTimeout(() => {
        const newScrollHeight = container.scrollHeight;
        container.scrollTop = prevScrollTop + (newScrollHeight - prevScrollHeight);
      }, 0);
    } catch (e) {
      console.error("Ошибка при подгрузке истории:", e);
    } finally {
      setLoadingMore(false);
    }
  };

  // onScroll: если дошли почти до верха — подгружаем старые
  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    if (container.scrollTop <= 80) {
      loadMoreMessages();
    }
  };

  // -------- lifecycle --------
  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    fetchConversations();

      window.dispatchEvent(new Event("unread:update"));
  }, [user, navigate]);

  useEffect(() => {
    if (!activeConversation) return;

    setMessages([]);
    setHasMore(false);
    setNextCursor(null);

    fetchMessages(activeConversation);
  }, [activeConversation]);

  // organizer из sessionStorage
  useEffect(() => {
    const savedOrganizer = sessionStorage.getItem("selectedOrganizer");
    if (!savedOrganizer) return;

    try {
      const organizer = JSON.parse(savedOrganizer);
      handleNewConversation(organizer);
    } catch (e) {
      console.error("Не удалось прочитать selectedOrganizer:", e);
    } finally {
      sessionStorage.removeItem("selectedOrganizer");
    }
  }, []);

  // ✅ function declaration (чтобы точно не было TDZ в socket callbacks)
  function markConversationAsReadLocal(partnerId) {
    setConversations((prev) =>
      (prev || []).map((c) =>
        c?.user?.id === partnerId ? { ...c, unreadCount: 0 } : c
      )
    );
  
  window.dispatchEvent(new Event("unread:update"));
}

  // -------- Socket.IO connect (once) --------
  useEffect(() => {
    const s = createSocket();
    socketRef.current = s;

    const onConnect = () => console.log("WS connected", s.id);
    const onConnectError = (e) => console.log("WS connect_error:", e.message);

    const onNew = (msg) => {
      const currentUser = userRef.current;
      const conv = activeConvRef.current;

      fetchConversations();

      // если активный диалог не открыт — просто обновим список (unreadCount придет с сервера)
      if (!conv?.user?.id || !currentUser?.id) return;

      const partnerId = conv.user.id;

      const isForThisChat =
        (msg.senderId === partnerId && msg.receiverId === currentUser.id) ||
        (msg.senderId === currentUser.id && msg.receiverId === partnerId);

      if (isForThisChat) {
        addMessageIfNotExists(msg);
        setTimeout(scrollToBottom, 0);

        // раз чат открыт — отмечаем как прочитано
        s.emit("conversation:read", { partnerId });
        markConversationAsReadLocal(partnerId);
        window.dispatchEvent(new Event("unread:update"));
      }
    };

    const onSent = (msg) => {
      addMessageIfNotExists(msg);
      fetchConversations();
      setTimeout(scrollToBottom, 0);
    };

    const onDelivered = (payload) => {
      if (!payload?.messageId) return;
      updateMessageStatus(payload.messageId, { deliveredAt: payload.deliveredAt });
    };

    const onRead = (payload) => {
      const ids = payload?.messageIds || [];
      if (!ids.length) return;
      updateManyMessageStatus(ids, { readAt: payload.readAt });
    };

    const onMsgError = (e) => {
      console.log("WS message:error", e);
      alert("Не удалось отправить сообщение: " + (e?.error || "WS error"));
    };

    s.on("connect", onConnect);
    s.on("connect_error", onConnectError);
    s.on("message:new", onNew);
    s.on("message:sent", onSent);
    s.on("message:delivered", onDelivered);
    s.on("messages:read", onRead);
    s.on("message:error", onMsgError);

    return () => {
      s.off("connect", onConnect);
      s.off("connect_error", onConnectError);
      s.off("message:new", onNew);
      s.off("message:sent", onSent);
      s.off("message:delivered", onDelivered);
      s.off("messages:read", onRead);
      s.off("message:error", onMsgError);
      s.disconnect();
    };
  }, []);

  // когда выбираем диалог — отмечаем как прочитано
  useEffect(() => {
    const conv = activeConversation;
    const currentUser = user;

    if (!conv?.user?.id || !currentUser?.id) return;

    const partnerId = conv.user.id;

    const sendRead = () => {
      const s = socketRef.current;
      if (!s || !s.connected) return false;
      s.emit("conversation:read", { partnerId });
      markConversationAsReadLocal(partnerId);
      return true;
    };

    if (!sendRead()) {
      setTimeout(() => sendRead(), 300);
      setTimeout(() => sendRead(), 800);
    }
  }, [activeConversation, user]);

  // -------- conversation actions --------
  const handleSelectConversation = (conversation) => {
    setActiveConversation(conversation);
  };

  const handleNewConversation = (organizer) => {
    if (!organizer?.id) return;

    const existingConversation = conversations.find(
      (conv) => conv?.user?.id === organizer.id
    );

    if (existingConversation) {
      setActiveConversation(existingConversation);
      return;
    }

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
  };

  // -------- send message --------
  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim() || !user || !activeConversation?.user?.id) return;

    const receiverId = activeConversation.user.id;
    const text = newMessage.trim();

    try {
      const socket = socketRef.current;

      if (socket && socket.connected) {
        socket.emit("message:send", { receiverId, text });
        setNewMessage("");
        return;
      }

      // fallback HTTP (на всякий случай)
      await api.post("/api/messages", { receiverId, text });
      setNewMessage("");
      await fetchMessages(activeConversation);
      await fetchConversations();
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

  const getStatusIcon = (m) => {
    if (m.senderId !== user.id) return "";
    if (m.readAt) return "✓✓";
    if (m.deliveredAt) return "✓";
    return "✓";
  };

  const handleDeleteActiveConversation = async () => {
    const partnerId = activeConversation?.user?.id;
    if (!partnerId) return;

    const ok = window.confirm(
      "Удалить диалог? Все сообщения будут удалены без восстановления."
    );
    if (!ok) return;

    try {
      await api.delete(`/api/messages/conversation/${partnerId}`);

      // ✅ убрать из списка диалогов
      setConversations((prev) =>
        (prev || []).filter((c) => c?.user?.id !== partnerId)
      );

      // ✅ закрыть чат
      setActiveConversation(null);
      setMessages([]);
    } catch (e) {
      console.error("Ошибка удаления диалога:", e);
      alert(
    e?.response?.status
      ? `Не удалось удалить: ${e.response.status} ${e.response.data?.message || ""}`
      : "Не удалось удалить диалог"
  );
    }
  };

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
                    <span className="conversation-name">{displayName(conv.user)}</span>

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
            <div className="chat-header chat-header-row">
              <div className="chat-partner-info">
                <h4>{displayName(activeConversation.user)}</h4>
                <span className="user-role">
                  {displayRole(activeConversation.user?.role)}
                </span>
              </div>

              <button
                type="button"
                className="chat-delete-btn"
                onClick={handleDeleteActiveConversation}
                title="Удалить диалог"
              >
                🗑️
              </button>
            </div>

            <div
              className="messages-container"
              ref={messagesContainerRef}
              onScroll={handleScroll}
            >
              {hasMore && (
                <div className="chat-load-more">
                  {loadingMore
                    ? "Загрузка..."
                    : "Прокрутите вверх, чтобы загрузить еще"}
                </div>
              )}

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

                      <div className="message-meta">
                        <span className="message-time">
                          {message.createdAt ? formatTime(message.createdAt) : ""}
                        </span>

                        {message.senderId === user.id && (
                          <span className="message-status">{getStatusIcon(message)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-messages">
                  <p>Нет сообщений</p>
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