import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../api/client";
import { createSocket } from "../api/socket";
import { consumeSelectedOrganizer } from "../utils/authSession";
import {
  formatTime,
  formatPersonName,
  truncateText,
} from "../utils/formatters";
import { getRoleLabel } from "../utils/presentation";
import EmptyState from "./ui/EmptyState";
import Icon from "./ui/Icon";
import { useFeedback } from "./ui/FeedbackProvider";
import "./Chat.css";

function Chat({ user }) {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

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
  const searchInputRef = useRef(null);
  const socketRef = useRef(null);
  const userRef = useRef(user);
  const activeConversationRef = useRef(activeConversation);

  const navigate = useNavigate();
  const { confirm, error } = useFeedback();

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  const getInitials = (person) => {
    const first = person?.firstName?.trim()?.charAt(0);
    const last = person?.lastName?.trim()?.charAt(0);

    if (first && last) return `${first}${last}`;
    if (first) return first;
    if (last) return last;
    return "?";
  };

  const scrollToBottom = (behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
  };

  const addMessageIfNotExists = (message) => {
    setMessages((prev) => {
      if (!message?.id) return [...prev, message];
      if (prev.some((item) => item?.id === message.id)) return prev;
      return [...prev, message];
    });
  };

  const updateMessageStatus = (messageId, patch) => {
    setMessages((prev) => prev.map((item) => (item.id === messageId ? { ...item, ...patch } : item)));
  };

  const updateManyMessageStatus = (messageIds, patch) => {
    const ids = new Set(messageIds || []);
    setMessages((prev) => prev.map((item) => (ids.has(item.id) ? { ...item, ...patch } : item)));
  };

  const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const highlightText = (text, query) => {
    if (!query?.trim()) return text;

    const matcher = new RegExp(escapeRegExp(query.trim()), "ig");
    const rawText = String(text || "");
    const matches = rawText.match(matcher);

    if (!matches) return rawText;

    const parts = rawText.split(matcher);
    const output = [];

    for (let index = 0; index < parts.length; index += 1) {
      output.push(parts[index]);

      if (index < matches.length) {
        output.push(
          <mark key={`match-${index}`} className="chat-highlight">
            {matches[index]}
          </mark>
        );
      }
    }

    return output;
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

  const fetchConversations = async () => {
    if (!userRef.current) return;

    try {
      const response = await api.get("/api/messages/conversations");
      setConversations(Array.isArray(response.data) ? response.data : []);
    } catch (requestError) {
      console.error("Ошибка при загрузке диалогов:", requestError);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversation) => {
    if (!userRef.current || !conversation?.user?.id) return;

    try {
      const response = await api.get(`/api/messages/conversation/${conversation.user.id}?limit=50`);
      const data = response.data;
      const items = Array.isArray(data) ? data : data?.items || [];

      setMessages(items);
      setHasMore(!Array.isArray(data) && Boolean(data?.hasMore));
      setNextCursor(!Array.isArray(data) ? data?.nextCursor || null : null);
      window.setTimeout(() => scrollToBottom("auto"), 0);
    } catch (requestError) {
      console.error("Ошибка при загрузке сообщений:", requestError);
    }
  };

  const loadMoreMessages = async () => {
    const conversation = activeConversationRef.current;

    if (!conversation?.user?.id || !hasMore || !nextCursor || loadingMore) return;

    const container = messagesContainerRef.current;
    if (!container) return;

    try {
      setLoadingMore(true);

      const previousHeight = container.scrollHeight;
      const previousScrollTop = container.scrollTop;

      const response = await api.get(
        `/api/messages/conversation/${conversation.user.id}?cursor=${nextCursor}&limit=50`
      );
      const data = response.data;
      const items = Array.isArray(data) ? data : data?.items || [];

      if (items.length) {
        setMessages((prev) => [...items, ...prev]);
      }

      setHasMore(!Array.isArray(data) && Boolean(data?.hasMore));
      setNextCursor(!Array.isArray(data) ? data?.nextCursor || null : null);

      window.setTimeout(() => {
        const nextHeight = container.scrollHeight;
        container.scrollTop = previousScrollTop + (nextHeight - previousHeight);
      }, 0);
    } catch (requestError) {
      console.error("Ошибка при подгрузке истории:", requestError);
    } finally {
      setLoadingMore(false);
    }
  };

  const jumpToMessage = async (messageId) => {
    const conversation = activeConversationRef.current;

    if (!conversation?.user?.id || !messageId) return;

    try {
      const response = await api.get(
        `/api/messages/conversation/${conversation.user.id}/around/${messageId}?before=30&after=30`
      );
      const items = response.data?.items || [];

      setMessages(items);

      window.setTimeout(() => {
        const element = document.getElementById(`msg-${messageId}`);
        element?.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlightMessageId(messageId);
        window.setTimeout(() => setHighlightMessageId(null), 1200);
      }, 0);
    } catch (requestError) {
      console.error("Ошибка перехода к сообщению:", requestError);
    }
  };

  const runSearch = async ({ reset = true } = {}) => {
    const conversation = activeConversationRef.current;
    const query = searchQuery.trim();

    if (!conversation?.user?.id || !query) {
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
      const response = await api.get(
        `/api/messages/conversation/${conversation.user.id}/search?q=${encodeURIComponent(
          query
        )}&limit=20${cursorPart}`
      );
      const items = response.data?.items || [];

      setSearchHits((prev) => (reset ? items : [...prev, ...items]));
      setSearchHasMore(Boolean(response.data?.hasMore));
      setSearchNextCursor(response.data?.nextCursor || null);

      if (reset) {
        setSearchIndex(0);
      }

      if (reset && items.length) {
        await jumpToMessage(items[0].id);
      }
    } catch (requestError) {
      console.error("Ошибка поиска по сообщениям:", requestError);
      setSearchHits([]);
      setSearchIndex(0);
      setSearchHasMore(false);
      setSearchNextCursor(null);
    } finally {
      setSearchLoading(false);
    }
  };

  const goToHit = async (direction) => {
    if (!searchHits.length) return;

    let nextIndex = searchIndex + direction;

    if (nextIndex < 0) nextIndex = 0;

    if (nextIndex >= searchHits.length && searchHasMore && searchNextCursor && !searchLoading) {
      await runSearch({ reset: false });
    }

    nextIndex = Math.min(nextIndex, Math.max(0, searchHits.length - 1));
    setSearchIndex(nextIndex);

    const nextHit = searchHits[nextIndex];
    if (nextHit?.id) {
      await jumpToMessage(nextHit.id);
    }
  };

  const handleSearchKeyDown = async (event) => {
    if (event.key === "Escape") {
      resetSearch();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (event.shiftKey) {
        await goToHit(-1);
      } else {
        await goToHit(1);
      }
    }
  };

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (container?.scrollTop <= 80) {
      loadMoreMessages();
    }
  };

  const markConversationAsReadLocal = (partnerId) => {
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation?.user?.id === partnerId ? { ...conversation, unreadCount: 0 } : conversation
      )
    );

    window.dispatchEvent(new Event("unread:update"));
  };

  const handleSelectConversation = (conversation) => {
    setActiveConversation(conversation);
  };

  const handleNewConversation = (organizer) => {
    if (!organizer?.id) return;

    const existingConversation = conversations.find(
      (conversation) => conversation?.user?.id === organizer.id
    );

    if (existingConversation) {
      setActiveConversation(existingConversation);
      return;
    }

    setActiveConversation({
      user: {
        id: organizer.id,
        firstName: organizer.firstName ?? null,
        lastName: organizer.lastName ?? null,
        role: organizer.role ?? "organizer",
      },
      lastMessage: {
        text: "",
        createdAt: new Date().toISOString(),
      },
      unreadCount: 0,
      isNew: true,
    });
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();

    if (!newMessage.trim() || !user || !activeConversation?.user?.id) return;

    const receiverId = activeConversation.user.id;
    const text = newMessage.trim();

    try {
      const socket = socketRef.current;

      if (socket?.connected) {
        socket.emit("message:send", { receiverId, text });
        setNewMessage("");
        return;
      }

      await api.post("/api/messages", { receiverId, text });
      setNewMessage("");

      await fetchMessages(activeConversation);
      await fetchConversations();
    } catch (requestError) {
      console.error("Ошибка при отправке сообщения:", requestError);
      error(
        requestError.response?.data?.message ||
          requestError.response?.data?.error ||
          "Не удалось отправить сообщение"
      );
    }
  };

  const handleDeleteActiveConversation = async () => {
    const partnerId = activeConversation?.user?.id;
    if (!partnerId) return;

    const approved = await confirm({
      title: "Удалить диалог?",
      message: "Все сообщения в диалоге будут удалены без возможности восстановления.",
      confirmLabel: "Удалить диалог",
      cancelLabel: "Отмена",
      tone: "danger",
    });

    if (!approved) return;

    try {
      await api.delete(`/api/messages/conversation/${partnerId}`);
      setConversations((prev) => prev.filter((conversation) => conversation?.user?.id !== partnerId));
      setActiveConversation(null);
      setMessages([]);
      resetSearch();
    } catch (requestError) {
      console.error("Ошибка удаления диалога:", requestError);
      error(
        requestError?.response?.data?.message ||
          requestError?.response?.data?.error ||
          "Не удалось удалить диалог"
      );
    }
  };

  const getDeliveryState = (message) => {
    if (message.senderId !== user?.id) return null;
    if (message.readAt) return { icon: "done_all", className: "message-status-read" };
    if (message.deliveredAt) return { icon: "done_all", className: "message-status-delivered" };
    return { icon: "done", className: "message-status-sent" };
  };

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    fetchConversations();
    window.dispatchEvent(new Event("unread:update"));
  }, [navigate, user]);

  useEffect(() => {
    if (!activeConversation) return;

    setMessages([]);
    setHasMore(false);
    setNextCursor(null);
    resetSearch();
    fetchMessages(activeConversation);
  }, [activeConversation]);

  useEffect(() => {
    const organizer = consumeSelectedOrganizer();
    if (organizer) {
      handleNewConversation(organizer);
    }
  }, [conversations.length]);

  useEffect(() => {
    if (!searchOpen) return undefined;

    window.setTimeout(() => searchInputRef.current?.focus(), 0);

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        resetSearch();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchOpen]);

  useEffect(() => {
    const socket = createSocket();
    socketRef.current = socket;

    const onNewMessage = (message) => {
      const currentUser = userRef.current;
      const conversation = activeConversationRef.current;

      fetchConversations();

      if (!conversation?.user?.id || !currentUser?.id) return;

      const partnerId = conversation.user.id;
      const belongsToCurrentThread =
        (message.senderId === partnerId && message.receiverId === currentUser.id) ||
        (message.senderId === currentUser.id && message.receiverId === partnerId);

      if (belongsToCurrentThread) {
        addMessageIfNotExists(message);
        window.setTimeout(scrollToBottom, 0);
        socket.emit("conversation:read", { partnerId });
        markConversationAsReadLocal(partnerId);
      }
    };

    const onMessageSent = (message) => {
      addMessageIfNotExists(message);
      fetchConversations();
      window.setTimeout(scrollToBottom, 0);
    };

    const onMessageDelivered = (payload) => {
      if (payload?.messageId) {
        updateMessageStatus(payload.messageId, { deliveredAt: payload.deliveredAt });
      }
    };

    const onMessagesRead = (payload) => {
      if (payload?.messageIds?.length) {
        updateManyMessageStatus(payload.messageIds, { readAt: payload.readAt });
      }
    };

    const onMessageError = (payload) => {
      console.error("WS message:error", payload);
      error(payload?.error || "Не удалось отправить сообщение");
    };

    socket.on("message:new", onNewMessage);
    socket.on("message:sent", onMessageSent);
    socket.on("message:delivered", onMessageDelivered);
    socket.on("messages:read", onMessagesRead);
    socket.on("message:error", onMessageError);

    return () => {
      socket.off("message:new", onNewMessage);
      socket.off("message:sent", onMessageSent);
      socket.off("message:delivered", onMessageDelivered);
      socket.off("messages:read", onMessagesRead);
      socket.off("message:error", onMessageError);
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const partnerId = activeConversation?.user?.id;
    if (!partnerId || !user?.id) return;

    const sendReadEvent = () => {
      const socket = socketRef.current;
      if (!socket?.connected) return false;

      socket.emit("conversation:read", { partnerId });
      markConversationAsReadLocal(partnerId);
      return true;
    };

    if (!sendReadEvent()) {
      window.setTimeout(sendReadEvent, 300);
      window.setTimeout(sendReadEvent, 800);
    }
  }, [activeConversation, user?.id]);

  if (!user) {
    return null;
  }

  if (loading) {
    return <div className="chat-loading">Загрузка чата...</div>;
  }

  return (
    <div className="chat-shell">
      <aside className="chat-sidebar">
        <div className="chat-panel-head">
          <div>
            <p className="section-kicker">Сообщения</p>
            <h2>Диалоги</h2>
          </div>
        </div>

        <div className="conversations-list">
          {conversations.length === 0 ? (
            <EmptyState
              icon="chat"
              title="Диалогов пока нет"
              description="Когда вы начнёте переписку с организатором или волонтёром, диалог появится здесь."
            />
          ) : (
            conversations.map((conversation) => (
              <button
                key={conversation.user.id}
                type="button"
                className={`conversation-item ${
                  activeConversation?.user?.id === conversation.user.id ? "active" : ""
                }`}
                onClick={() => handleSelectConversation(conversation)}
              >
                <span className="conversation-avatar">{getInitials(conversation.user)}</span>

                <span className="conversation-info">
                  <span className="conversation-head">
                    <strong>{formatPersonName(conversation.user, "Пользователь")}</strong>
                    <span>{formatTime(conversation?.lastMessage?.createdAt)}</span>
                  </span>
                  <span className="conversation-preview">
                    {conversation?.lastMessage?.text
                      ? truncateText(conversation.lastMessage.text, 42)
                      : "Сообщений пока нет"}
                  </span>
                </span>

                {conversation.unreadCount > 0 ? (
                  <span className="unread-badge">{conversation.unreadCount}</span>
                ) : null}
              </button>
            ))
          )}
        </div>
      </aside>

      <section className="chat-main">
        {activeConversation ? (
          <>
            <div className="chat-panel-head chat-panel-head-main">
              <div>
                <h2>{formatPersonName(activeConversation.user, "Пользователь")}</h2>
                <p>{getRoleLabel(activeConversation.user?.role)}</p>
              </div>

              <div className="chat-head-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    const nextValue = !searchOpen;
                    setSearchOpen(nextValue);
                    if (!nextValue) {
                      resetSearch();
                    }
                  }}
                >
                  <Icon name="search" />
                  <span>Поиск</span>
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleDeleteActiveConversation}
                >
                  <Icon name="delete" />
                  <span>Удалить диалог</span>
                </button>
              </div>
            </div>

            {searchOpen ? (
              <div className="chat-search-bar">
                <label className="chat-search-input-wrap">
                  <Icon name="search" />
                  <input
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Поиск по сообщениям"
                    className="chat-search-input"
                  />
                </label>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => runSearch({ reset: true })}
                  disabled={searchLoading || !searchQuery.trim()}
                >
                  <Icon name="search" />
                  <span>{searchLoading ? "Поиск..." : "Найти"}</span>
                </button>

                <div className="chat-search-nav">
                  <button type="button" className="app-icon-button" onClick={() => goToHit(-1)}>
                    <Icon name="keyboard_arrow_up" />
                  </button>
                  <button type="button" className="app-icon-button" onClick={() => goToHit(1)}>
                    <Icon name="keyboard_arrow_down" />
                  </button>
                  <span>
                    {searchHits.length
                      ? `${Math.min(searchIndex + 1, searchHits.length)}/${searchHits.length}`
                      : "0/0"}
                  </span>
                  <button type="button" className="app-icon-button" onClick={resetSearch}>
                    <Icon name="close" />
                  </button>
                </div>
              </div>
            ) : null}

            <div className="messages-container" ref={messagesContainerRef} onScroll={handleScroll}>
              {hasMore ? (
                <div className="chat-load-more">
                  {loadingMore
                    ? "Загрузка истории..."
                    : "Прокрутите выше, чтобы загрузить более ранние сообщения"}
                </div>
              ) : null}

              {messages.length === 0 ? (
                <EmptyState
                  icon="forum"
                  title="Сообщений пока нет"
                  description="Начните диалог первым сообщением."
                />
              ) : (
                messages.map((message) => {
                  const deliveryState = getDeliveryState(message);

                  return (
                    <div
                      key={message.id}
                      className={`message-row ${message.senderId === user.id ? "sent" : "received"}`}
                    >
                      <div
                        id={`msg-${message.id}`}
                        className={`message-bubble ${
                          highlightMessageId === message.id ? "message-bubble-highlight" : ""
                        }`}
                      >
                        <p>{highlightText(message.text, searchOpen ? searchQuery : "")}</p>
                        <div className="message-meta">
                          <span>{formatTime(message.createdAt)}</span>
                          {deliveryState ? (
                            <span className={`message-status ${deliveryState.className}`}>
                              <Icon name={deliveryState.icon} />
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              <div ref={messagesEndRef} />
            </div>

            <form className="message-input-form" onSubmit={handleSendMessage}>
              <textarea
                rows={1}
                value={newMessage}
                onChange={(event) => setNewMessage(event.target.value)}
                placeholder="Введите сообщение"
                className="message-input"
              />
              <button type="submit" className="btn btn-primary" disabled={!newMessage.trim()}>
                <Icon name="send" />
                <span>Отправить</span>
              </button>
            </form>
          </>
        ) : (
          <div className="chat-empty-state">
            <EmptyState
              icon="chat_bubble"
              title="Выберите диалог"
              description="Откройте существующий чат слева или напишите организатору со страницы проекта."
            />
          </div>
        )}
      </section>
    </div>
  );
}

export default Chat;
