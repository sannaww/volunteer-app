import React, { useEffect, useRef, useState } from "react";
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

  // search in conversation (server-side)
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchHits, setSearchHits] = useState([]);
  const [searchIndex, setSearchIndex] = useState(0);
  const [searchHasMore, setSearchHasMore] = useState(false);
  const [searchNextCursor, setSearchNextCursor] = useState(null);
  const [highlightMessageId, setHighlightMessageId] = useState(null);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const socketRef = useRef(null);

  // ✅ FIX: searchInputRef должен существовать
  const searchInputRef = useRef(null);

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
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, ...patch } : m)));
  };

  const updateManyMessageStatus = (ids, patch) => {
    const setIds = new Set(ids || []);
    setMessages((prev) => prev.map((m) => (setIds.has(m.id) ? { ...m, ...patch } : m)));
  };

  // -------- search helpers --------
  const escapeRegExp = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const highlightText = (text, q) => {
    if (!q?.trim()) return text;
    const query = q.trim();
    const re = new RegExp(escapeRegExp(query), "ig");
    const raw = String(text ?? "");
    const matches = raw.match(re);
    if (!matches) return raw;

    const parts = raw.split(re);
    const out = [];
    for (let i = 0; i < parts.length; i++) {
      out.push(parts[i]);
      if (i < matches.length) {
        out.push(
          <mark key={`${i}-${matches[i]}-${Math.random()}`} className="chat-highlight">
            {matches[i]}
          </mark>
        );
      }
    }
    return out;
  };

  const resetSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
    setSearchHits([]);
    setSearchIndex(0);
    setSearchHasMore(false);
    setSearchNextCursor(null);
    setHighlightMessageId(null);
  };

  const jumpToMessage = async (messageId) => {
    const conv = activeConversation;
    if (!conv?.user?.id || !messageId) return;

    try {
      const { data } = await api.get(
        `/api/messages/conversation/${conv.user.id}/around/${messageId}?before=30&after=30`
      );

      const items = data?.items || [];
      setMessages(items);

      setTimeout(() => {
        const el = document.getElementById(`msg-${messageId}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlightMessageId(messageId);
        setTimeout(() => setHighlightMessageId(null), 1200);
      }, 0);
    } catch (e) {
      console.error("jumpToMessage error:", e);
    }
  };

  const runSearch = async ({ reset = true } = {}) => {
    const conv = activeConversation;
    const q = searchQuery.trim();

    if (!conv?.user?.id || !q) {
      setSearchHits([]);
      setSearchIndex(0);
      setSearchHasMore(false);
      setSearchNextCursor(null);
      return;
    }

    try {
      setSearchLoading(true);

      const cursorPart =
        !reset && searchNextCursor ? `&cursor=${encodeURIComponent(searchNextCursor)}` : "";

      const url = `/api/messages/conversation/${conv.user.id}/search?q=${encodeURIComponent(
        q
      )}&limit=20${cursorPart}`;

      const { data } = await api.get(url);
      const items = data?.items || [];

      setSearchHits((prev) => (reset ? items : [...prev, ...items]));
      setSearchHasMore(Boolean(data?.hasMore));
      setSearchNextCursor(data?.nextCursor || null);

      if (reset) setSearchIndex(0);
      if (reset && items.length) await jumpToMessage(items[0].id);
    } catch (e) {
      console.error("search error:", e);
      setSearchHits([]);
      setSearchIndex(0);
      setSearchHasMore(false);
      setSearchNextCursor(null);
    } finally {
      setSearchLoading(false);
    }
  };

  const goToHit = async (dir) => {
    if (!searchHits.length) return;

    let next = searchIndex + dir;
    if (next < 0) next = 0;

    if (next >= searchHits.length && searchHasMore && searchNextCursor && !searchLoading) {
      await runSearch({ reset: false });
    }

    const max = Math.max(0, searchHits.length - 1);
    next = Math.min(next, max);

    setSearchIndex(next);

    const hit = searchHits[next];
    if (hit?.id) await jumpToMessage(hit.id);
  };

  const onSearchKeyDown = async (e) => {
    if (e.key === "Escape") {
      setSearchOpen(false);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) await goToHit(-1);
      else await goToHit(1);
    }
  };

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 0);
  }, [searchOpen]);

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

  const fetchMessages = async (conv) => {
    const currentUser = userRef.current;
    if (!currentUser || !conv?.user?.id) return;

    try {
      const response = await api.get(`/api/messages/conversation/${conv.user.id}?limit=50`);
      const data = response.data;

      const items = Array.isArray(data) ? data : data?.items || [];
      setMessages(items);

      setHasMore(!Array.isArray(data) && Boolean(data?.hasMore));
      setNextCursor(!Array.isArray(data) ? data?.nextCursor || null : null);

      setTimeout(scrollToBottom, 0);
    } catch (error) {
      console.error("Ошибка при загрузке сообщений:", error);
    }
  };

  const loadMoreMessages = async () => {
    const conv = activeConversation;
    if (!conv?.user?.id) return;
    if (!hasMore || !nextCursor || loadingMore) return;

    const container = messagesContainerRef.current;
    if (!container) return;

    try {
      setLoadingMore(true);

      const prevScrollHeight = container.scrollHeight;
      const prevScrollTop = container.scrollTop;

      const response = await api.get(
        `/api/messages/conversation/${conv.user.id}?cursor=${nextCursor}&limit=50`
      );
      const data = response.data;

      const items = Array.isArray(data) ? data : data?.items || [];
      if (items.length) setMessages((prev) => [...items, ...prev]);

      setHasMore(!Array.isArray(data) && Boolean(data?.hasMore));
      setNextCursor(!Array.isArray(data) ? data?.nextCursor || null : null);

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

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    if (container.scrollTop <= 80) loadMoreMessages();
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
    resetSearch();

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

  function markConversationAsReadLocal(partnerId) {
    setConversations((prev) =>
      (prev || []).map((c) => (c?.user?.id === partnerId ? { ...c, unreadCount: 0 } : c))
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

      if (!conv?.user?.id || !currentUser?.id) return;

      const partnerId = conv.user.id;
      const isForThisChat =
        (msg.senderId === partnerId && msg.receiverId === currentUser.id) ||
        (msg.senderId === currentUser.id && msg.receiverId === partnerId);

      if (isForThisChat) {
        addMessageIfNotExists(msg);
        setTimeout(scrollToBottom, 0);

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

    const existingConversation = conversations.find((conv) => conv?.user?.id === organizer.id);
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
      lastMessage: { text: "Новый диалог", createdAt: new Date().toISOString() },
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
          (error.response?.data?.message || error.response?.data?.error || error.message)
      );
    }
  };

  if (!user) {
    return (
      <div className="chat-error">
        <h3>Требуется авторизация</h3>
        <p>Пожалуйста, войдите в систему для доступа к чату</p>
        <button onClick={() => navigate("/login")} className="btn btn-primary" type="button">
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

    const ok = window.confirm("Удалить диалог? Все сообщения будут удалены без восстановления.");
    if (!ok) return;

    try {
      await api.delete(`/api/messages/conversation/${partnerId}`);

      setConversations((prev) => (prev || []).filter((c) => c?.user?.id !== partnerId));
      setActiveConversation(null);
      setMessages([]);
      resetSearch();
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
                      {conv?.lastMessage?.createdAt ? formatTime(conv.lastMessage.createdAt) : ""}
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

                  {conv.unreadCount > 0 && <span className="unread-badge">{conv.unreadCount}</span>}
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

                <div className="chat-role-row">
                  <span className="user-role">{displayRole(activeConversation.user?.role)}</span>

                  <button
                    type="button"
                    className="chat-search-btn"
                    title="Поиск в диалоге"
                    onClick={() => {
                      const next = !searchOpen;
                      setSearchOpen(next);
                      if (next) setTimeout(() => searchInputRef.current?.focus(), 0);
                    }}
                  >
                    🔍
                  </button>
                </div>

                {searchOpen && (
                  <div className="chat-search-bar">
                    <input
                      ref={searchInputRef}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={onSearchKeyDown}
                      placeholder="Поиск в диалоге…"
                      className="chat-search-input"
                    />

                    <button
                      type="button"
                      className="chat-search-action"
                      onClick={() => runSearch({ reset: true })}
                      disabled={searchLoading || !searchQuery.trim()}
                      title="Найти"
                    >
                      {searchLoading ? "..." : "Найти"}
                    </button>

                    <div className="chat-search-nav">
                      <button type="button" onClick={() => goToHit(-1)} disabled={!searchHits.length}>
                        ↑
                      </button>
                      <button type="button" onClick={() => goToHit(1)} disabled={!searchHits.length}>
                        ↓
                      </button>
                      <span className="chat-search-count">
                        {searchHits.length
                          ? `${Math.min(searchIndex + 1, searchHits.length)}/${searchHits.length}`
                          : "0/0"}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="chat-search-close"
                      onClick={() => setSearchOpen(false)}
                      title="Закрыть"
                    >
                      ✖
                    </button>
                  </div>
                )}
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

            <div className="messages-container" ref={messagesContainerRef} onScroll={handleScroll}>
              {hasMore && (
                <div className="chat-load-more">
                  {loadingMore ? "Загрузка..." : "Прокрутите вверх, чтобы загрузить еще"}
                </div>
              )}

              {messages.length > 0 ? (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`message ${message.senderId === user.id ? "sent" : "received"}`}
                  >
                    <div
                      id={`msg-${message.id}`}
                      className={`message-content ${highlightMessageId === message.id ? "msg-flash" : ""}`}
                    >
                      <p>{highlightText(message.text, searchOpen ? searchQuery : "")}</p>

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
              <button type="submit" className="send-button" disabled={!newMessage.trim()}>
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