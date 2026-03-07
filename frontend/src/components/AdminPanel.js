import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../api/client";
import { formatDate, formatDateTime, formatPersonName } from "../utils/formatters";
import {
  getProjectStatusMeta,
  getProjectTypeLabel,
  getRoleLabel,
} from "../utils/presentation";
import EmptyState from "./ui/EmptyState";
import Icon from "./ui/Icon";
import StatusPill from "./ui/StatusPill";
import { useFeedback } from "./ui/FeedbackProvider";
import "./AdminPanel.css";

const ROLE_OPTIONS = ["volunteer", "organizer", "admin"];

function AdminPanel({ user, embedded = false, onOpenFullAdmin }) {
  const [tab, setTab] = useState("projects");

  const [pendingProjects, setPendingProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [query, setQuery] = useState("");

  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);

  const [reportsSummary, setReportsSummary] = useState(null);
  const [userGrowth, setUserGrowth] = useState([]);
  const [projectCategories, setProjectCategories] = useState([]);
  const [projectStatuses, setProjectStatuses] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);

  const navigate = useNavigate();
  const { confirm, error, prompt, success } = useFeedback();

  const openFullAdmin = () => {
    if (typeof onOpenFullAdmin === "function") {
      onOpenFullAdmin();
      return;
    }

    navigate("/admin");
  };

  const fetchPendingProjects = async () => {
    setLoadingProjects(true);
    try {
      const response = await api.get("/api/admin/projects/pending");
      setPendingProjects(Array.isArray(response.data) ? response.data : []);
    } catch (requestError) {
      console.error("Ошибка загрузки проектов на модерации:", requestError);
      setPendingProjects([]);
      error("Не удалось загрузить проекты на модерации");
    } finally {
      setLoadingProjects(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await api.get("/api/admin/users");
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (requestError) {
      console.error("Ошибка загрузки пользователей:", requestError);
      setUsers([]);
      error("Не удалось загрузить список пользователей");
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchReviews = async () => {
    setLoadingReviews(true);
    try {
      const response = await api.get("/api/admin/reviews");
      setReviews(Array.isArray(response.data) ? response.data : []);
    } catch (requestError) {
      console.error("Ошибка загрузки отзывов:", requestError);
      setReviews([]);
      error("Не удалось загрузить отзывы");
    } finally {
      setLoadingReviews(false);
    }
  };

  const fetchReports = async () => {
    setLoadingReports(true);
    try {
      const [summaryRes, growthRes, categoriesRes, statusesRes] = await Promise.all([
        api.get("/api/admin/reports/summary"),
        api.get("/api/admin/reports/user-growth?months=12"),
        api.get("/api/admin/reports/project-categories"),
        api.get("/api/admin/reports/project-statuses"),
      ]);

      setReportsSummary(summaryRes.data || null);
      setUserGrowth(Array.isArray(growthRes.data?.items) ? growthRes.data.items : []);
      setProjectCategories(Array.isArray(categoriesRes.data?.items) ? categoriesRes.data.items : []);
      setProjectStatuses(Array.isArray(statusesRes.data?.items) ? statusesRes.data.items : []);
    } catch (requestError) {
      console.error("Ошибка загрузки отчётов:", requestError);
      setReportsSummary(null);
      setUserGrowth([]);
      setProjectCategories([]);
      setProjectStatuses([]);
      error("Не удалось загрузить административные отчёты");
    } finally {
      setLoadingReports(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([
      fetchPendingProjects(),
      fetchUsers(),
      fetchReviews(),
      fetchReports(),
    ]);
  };

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    refreshAll();
  }, [user?.id]);

  const approveProject = async (projectId) => {
    try {
      await api.patch(`/api/admin/projects/${projectId}/approve`);
      success("Проект одобрен.");
      await Promise.all([fetchPendingProjects(), fetchReports()]);
    } catch (requestError) {
      console.error("Ошибка одобрения проекта:", requestError);
      error("Не удалось одобрить проект");
    }
  };

  const rejectProject = async (projectId) => {
    const reason = await prompt({
      title: "Отклонение проекта",
      message: "При необходимости добавьте короткую причину отклонения.",
      confirmLabel: "Отклонить",
      cancelLabel: "Отмена",
      placeholder: "Причина отклонения",
      tone: "danger",
    });

    if (reason === null) return;

    try {
      await api.patch(`/api/admin/projects/${projectId}/reject`, {
        reason: reason || null,
      });
      success("Проект отклонён.");
      await Promise.all([fetchPendingProjects(), fetchReports()]);
    } catch (requestError) {
      console.error("Ошибка отклонения проекта:", requestError);
      error("Не удалось отклонить проект");
    }
  };

  const blockUser = async (id) => {
    try {
      await api.patch(`/api/admin/users/${id}/block`);
      setUsers((prev) => prev.map((item) => (item.id === id ? { ...item, isBlocked: true } : item)));
      success("Пользователь заблокирован.");
    } catch (requestError) {
      console.error("Ошибка блокировки пользователя:", requestError);
      error("Не удалось заблокировать пользователя");
    }
  };

  const unblockUser = async (id) => {
    try {
      await api.patch(`/api/admin/users/${id}/unblock`);
      setUsers((prev) => prev.map((item) => (item.id === id ? { ...item, isBlocked: false } : item)));
      success("Пользователь разблокирован.");
    } catch (requestError) {
      console.error("Ошибка разблокировки пользователя:", requestError);
      error("Не удалось разблокировать пользователя");
    }
  };

  const changeRole = async (id, role) => {
    try {
      await api.patch(`/api/admin/users/${id}/role`, { role });
      setUsers((prev) => prev.map((item) => (item.id === id ? { ...item, role } : item)));
      success("Роль пользователя обновлена.");
    } catch (requestError) {
      console.error("Ошибка смены роли:", requestError);
      error("Не удалось изменить роль пользователя");
    }
  };

  const deleteReview = async (reviewId) => {
    const approved = await confirm({
      title: "Удалить отзыв?",
      message: "Отзыв будет удалён без возможности восстановления.",
      confirmLabel: "Удалить",
      cancelLabel: "Оставить",
      tone: "danger",
    });

    if (!approved) return;

    try {
      await api.delete(`/api/admin/reviews/${reviewId}`);
      setReviews((prev) => prev.filter((item) => item.id !== reviewId));
      success("Отзыв удалён.");
      await fetchReports();
    } catch (requestError) {
      console.error("Ошибка удаления отзыва:", requestError);
      error("Не удалось удалить отзыв");
    }
  };

  const filteredUsers = useMemo(() => {
    const searchValue = query.trim().toLowerCase();
    if (!searchValue) return users;

    return users.filter((item) => {
      const haystack = [
        item.id,
        item.email,
        item.firstName,
        item.lastName,
        item.role,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(searchValue);
    });
  }, [query, users]);

  if (!user) {
    return <div className="admin-loading">Загрузка...</div>;
  }

  if (user.role !== "admin") {
    return (
      <div className="admin-error">
        <h2>Доступ запрещён</h2>
        <p>Эта страница доступна только администратору.</p>
      </div>
    );
  }

  return (
    <div className={`admin-panel ${embedded ? "admin-panel-embedded" : ""}`}>
      <div className="admin-header">
        <div>
          <p className="section-kicker">Администрирование</p>
          <h1>{embedded ? "Операционный контур" : "Админ-панель"}</h1>
          <p>
            Модерация проектов, управление пользователями, контроль отзывов и
            сводные отчёты в одном интерфейсе.
          </p>
        </div>

        <div className="admin-header-actions">
          <button type="button" className="btn btn-secondary" onClick={refreshAll}>
            <Icon name="refresh" />
            <span>Обновить всё</span>
          </button>

          {embedded ? (
            <button type="button" className="btn btn-primary" onClick={openFullAdmin}>
              <Icon name="open_in_new" />
              <span>Полная панель</span>
            </button>
          ) : null}
        </div>
      </div>

      <div className="admin-tabs">
        <button
          type="button"
          className={`tab-btn ${tab === "projects" ? "active" : ""}`}
          onClick={() => setTab("projects")}
        >
          <Icon name="fact_check" />
          <span>Проекты</span>
        </button>
        <button
          type="button"
          className={`tab-btn ${tab === "reviews" ? "active" : ""}`}
          onClick={() => setTab("reviews")}
        >
          <Icon name="reviews" />
          <span>Отзывы</span>
        </button>
        <button
          type="button"
          className={`tab-btn ${tab === "users" ? "active" : ""}`}
          onClick={() => setTab("users")}
        >
          <Icon name="groups" />
          <span>Пользователи</span>
        </button>
        <button
          type="button"
          className={`tab-btn ${tab === "reports" ? "active" : ""}`}
          onClick={() => setTab("reports")}
        >
          <Icon name="insights" />
          <span>Отчёты</span>
        </button>
      </div>

      {tab === "projects" ? (
        <section className="admin-section">
          <div className="section-header">
            <div>
              <h2>Проекты на модерации</h2>
              <p>Ручная проверка новых и обновлённых инициатив перед публикацией.</p>
            </div>
            <button type="button" className="btn btn-secondary" onClick={fetchPendingProjects}>
              <Icon name="refresh" />
              <span>Обновить</span>
            </button>
          </div>

          {loadingProjects ? (
            <div className="admin-loading">Загрузка проектов...</div>
          ) : pendingProjects.length === 0 ? (
            <EmptyState
              icon="task_alt"
              title="Очередь модерации пуста"
              description="Новых проектов, ожидающих решения, сейчас нет."
            />
          ) : (
            <div className="admin-card-grid">
              {pendingProjects.map((project) => {
                const statusMeta = getProjectStatusMeta(project.status || "DRAFT");

                return (
                  <article key={project.id} className="admin-card">
                    <div className="admin-card-head">
                      <div>
                        <h3>{project.title}</h3>
                        <p>{project.description || "Описание отсутствует."}</p>
                      </div>
                      <StatusPill label={statusMeta.label} tone={statusMeta.tone} />
                    </div>

                    <div className="admin-card-meta">
                      <span>
                        <strong>Организатор:</strong>{" "}
                        {formatPersonName(project.creator, "Организатор")}
                      </span>
                      <span>
                        <strong>Тип:</strong> {getProjectTypeLabel(project.projectType)}
                      </span>
                      <span>
                        <strong>Дата старта:</strong> {formatDate(project.startDate)}
                      </span>
                      <span>
                        <strong>Локация:</strong> {project.location || "Не указана"}
                      </span>
                    </div>

                    <div className="admin-card-actions">
                      <button
                        type="button"
                        className="btn btn-success"
                        onClick={() => approveProject(project.id)}
                      >
                        <Icon name="check_circle" />
                        <span>Одобрить</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => rejectProject(project.id)}
                      >
                        <Icon name="cancel" />
                        <span>Отклонить</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : null}

      {tab === "reviews" ? (
        <section className="admin-section">
          <div className="section-header">
            <div>
              <h2>Отзывы</h2>
              <p>Контент-модерация и ручное удаление конфликтных или некорректных записей.</p>
            </div>
            <button type="button" className="btn btn-secondary" onClick={fetchReviews}>
              <Icon name="refresh" />
              <span>Обновить</span>
            </button>
          </div>

          {loadingReviews ? (
            <div className="admin-loading">Загрузка отзывов...</div>
          ) : reviews.length === 0 ? (
            <EmptyState
              icon="rate_review"
              title="Отзывов пока нет"
              description="После появления пользовательских отзывов они будут доступны здесь."
            />
          ) : (
            <div className="admin-card-grid">
              {reviews.map((review) => (
                <article key={review.id} className="admin-card">
                  <div className="admin-card-head">
                    <div>
                      <h3>{review.project?.title || "Проект"}</h3>
                      <p>{review.text || "Автор не добавил текст к отзыву."}</p>
                    </div>
                    <span className="admin-rating">{review.rating}/5</span>
                  </div>

                  <div className="admin-card-meta">
                    <span>
                      <strong>Автор:</strong>{" "}
                      {review.authorName || review.authorEmail || `Пользователь #${review.authorId}`}
                    </span>
                    <span>
                      <strong>Создан:</strong> {formatDateTime(review.createdAt)}
                    </span>
                    <span>
                      <strong>Проект ID:</strong> {review.projectId}
                    </span>
                  </div>

                  <div className="admin-card-actions">
                    <button
                      type="button"
                      className="btn btn-danger admin-review-delete-btn"
                      onClick={() => deleteReview(review.id)}
                    >
                      <Icon name="delete" />
                      <span>Удалить отзыв</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {tab === "users" ? (
        <section className="admin-section">
          <div className="section-header">
            <div>
              <h2>Пользователи</h2>
              <p>Поиск, управление ролями и блокировками без выхода из панели.</p>
            </div>
            <button type="button" className="btn btn-secondary" onClick={fetchUsers}>
              <Icon name="refresh" />
              <span>Обновить</span>
            </button>
          </div>

          <div className="admin-toolbar">
            <label className="admin-search">
              <Icon name="search" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Поиск по ID, email, имени или роли"
              />
            </label>
          </div>

          {loadingUsers ? (
            <div className="admin-loading">Загрузка пользователей...</div>
          ) : filteredUsers.length === 0 ? (
            <EmptyState
              icon="person_search"
              title="Пользователи не найдены"
              description="Измените поисковый запрос или обновите список."
            />
          ) : (
            <div className="table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Пользователь</th>
                    <th>Роль</th>
                    <th>Статус</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((item) => (
                    <tr key={item.id}>
                      <td>{item.id}</td>
                      <td>
                        <div className="admin-user-cell">
                          <strong>{formatPersonName(item, "Пользователь")}</strong>
                          <span>{item.email || "Email не указан"}</span>
                        </div>
                      </td>
                      <td>
                        <select
                          value={item.role}
                          onChange={(event) => changeRole(item.id, event.target.value)}
                        >
                          {ROLE_OPTIONS.map((role) => (
                            <option key={role} value={role}>
                              {getRoleLabel(role)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <StatusPill
                          label={item.isBlocked ? "Заблокирован" : "Активен"}
                          tone={item.isBlocked ? "cancelled" : "active"}
                        />
                      </td>
                      <td>
                        {item.isBlocked ? (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => unblockUser(item.id)}
                          >
                            <Icon name="lock_open" />
                            <span>Разблокировать</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-danger"
                            onClick={() => blockUser(item.id)}
                          >
                            <Icon name="block" />
                            <span>Заблокировать</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {tab === "reports" ? (
        <section className="admin-section">
          <div className="section-header">
            <div>
              <h2>Отчёты и аналитика</h2>
              <p>Сводные показатели по платформе и быстрый экспорт CSV без отдельного BI-контура.</p>
            </div>
            <div className="admin-header-actions">
              <button type="button" className="btn btn-secondary" onClick={fetchReports}>
                <Icon name="refresh" />
                <span>Обновить</span>
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => exportAllReportsCsv({ reportsSummary, userGrowth, projectCategories, projectStatuses })}
                disabled={loadingReports}
              >
                <Icon name="download" />
                <span>Экспорт CSV</span>
              </button>
            </div>
          </div>

          {loadingReports ? (
            <div className="admin-loading">Загрузка отчётов...</div>
          ) : (
            <>
              <div className="admin-summary-grid">
                <SummaryCard title="Пользователи" value={reportsSummary?.usersTotal ?? 0} />
                <SummaryCard title="Проекты" value={reportsSummary?.projectsTotal ?? 0} />
                <SummaryCard title="Активные проекты" value={reportsSummary?.activeProjects ?? 0} />
                <SummaryCard title="Заявки" value={reportsSummary?.applicationsTotal ?? 0} />
                <SummaryCard title="Отзывы" value={reportsSummary?.reviewsTotal ?? 0} />
                <SummaryCard title="Черновики" value={reportsSummary?.draftProjects ?? 0} />
              </div>

              <div className="admin-report-grid">
                <article className="admin-card admin-card-wide">
                  <div className="admin-card-head">
                    <div>
                      <h3>Рост пользователей</h3>
                      <p>Новые регистрации по месяцам за последний год.</p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => exportUsersGrowthCsv(userGrowth)}
                    >
                      <Icon name="download" />
                      <span>CSV</span>
                    </button>
                  </div>
                  <SimpleBarChart
                    items={userGrowth.map((item) => ({
                      label: item.label || item.month,
                      value: item.newUsers,
                    }))}
                    emptyText="Нет данных по росту пользователей."
                  />
                </article>

                <article className="admin-card">
                  <div className="admin-card-head">
                    <div>
                      <h3>Категории проектов</h3>
                      <p>Распределение проектного портфеля по типам.</p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => exportCategoriesCsv(projectCategories)}
                    >
                      <Icon name="download" />
                      <span>CSV</span>
                    </button>
                  </div>
                  <SimpleBarChart
                    items={projectCategories.map((item) => ({
                      label: getProjectTypeLabel(item.category),
                      value: item.count,
                    }))}
                    emptyText="Нет данных по категориям."
                  />
                </article>

                <article className="admin-card">
                  <div className="admin-card-head">
                    <div>
                      <h3>Статусы проектов</h3>
                      <p>Текущее распределение по жизненному циклу инициатив.</p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => exportStatusesCsv(projectStatuses)}
                    >
                      <Icon name="download" />
                      <span>CSV</span>
                    </button>
                  </div>
                  <SimpleBarChart
                    items={projectStatuses.map((item) => ({
                      label: getProjectStatusMeta(item.status).label,
                      value: item.count,
                    }))}
                    emptyText="Нет данных по статусам."
                  />
                </article>
              </div>
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}

function SummaryCard({ title, value }) {
  return (
    <article className="admin-summary-card">
      <span>{title}</span>
      <strong>{value}</strong>
    </article>
  );
}

function SimpleBarChart({ items, emptyText }) {
  if (!items?.length) {
    return <EmptyState icon="bar_chart" title="Пока пусто" description={emptyText} />;
  }

  const max = Math.max(...items.map((item) => Number(item.value) || 0), 1);

  return (
    <div className="admin-chart">
      {items.map((item) => {
        const value = Number(item.value) || 0;
        const width = `${Math.max(4, Math.round((value / max) * 100))}%`;

        return (
          <div key={`${item.label}-${value}`} className="admin-chart-row">
            <div className="admin-chart-head">
              <span>{item.label}</span>
              <strong>{value}</strong>
            </div>
            <div className="admin-chart-track">
              <div className="admin-chart-bar" style={{ width }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function escapeCsvCell(value) {
  const stringValue = String(value ?? "");

  if (/[",;\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function downloadCsv(rows, filename) {
  const csv = rows.map((row) => row.map(escapeCsvCell).join(";")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function exportUsersGrowthCsv(userGrowth) {
  downloadCsv(
    [
      ["Отчёт", "Рост пользователей по месяцам"],
      ["Дата экспорта", new Date().toLocaleString("ru-RU")],
      [],
      ["Месяц", "Новых пользователей", "Накопительно"],
      ...userGrowth.map((item) => [item.label || item.month, item.newUsers ?? 0, item.cumulative ?? ""]),
    ],
    "admin_user_growth.csv"
  );
}

function exportCategoriesCsv(projectCategories) {
  downloadCsv(
    [
      ["Отчёт", "Категории проектов"],
      ["Дата экспорта", new Date().toLocaleString("ru-RU")],
      [],
      ["Категория", "Количество"],
      ...projectCategories.map((item) => [getProjectTypeLabel(item.category), item.count ?? 0]),
    ],
    "admin_project_categories.csv"
  );
}

function exportStatusesCsv(projectStatuses) {
  downloadCsv(
    [
      ["Отчёт", "Статусы проектов"],
      ["Дата экспорта", new Date().toLocaleString("ru-RU")],
      [],
      ["Статус", "Количество"],
      ...projectStatuses.map((item) => [getProjectStatusMeta(item.status).label, item.count ?? 0]),
    ],
    "admin_project_statuses.csv"
  );
}

function exportAllReportsCsv({ reportsSummary, userGrowth, projectCategories, projectStatuses }) {
  downloadCsv(
    [
      ["Административный отчёт", ""],
      ["Дата экспорта", new Date().toLocaleString("ru-RU")],
      [],
      ["Сводные показатели", ""],
      ["Показатель", "Значение"],
      ["Пользователи", reportsSummary?.usersTotal ?? 0],
      ["Проекты", reportsSummary?.projectsTotal ?? 0],
      ["Активные проекты", reportsSummary?.activeProjects ?? 0],
      ["Заявки", reportsSummary?.applicationsTotal ?? 0],
      ["Отзывы", reportsSummary?.reviewsTotal ?? 0],
      ["Черновики", reportsSummary?.draftProjects ?? 0],
      [],
      ["Рост пользователей", ""],
      ["Месяц", "Новых пользователей", "Накопительно"],
      ...userGrowth.map((item) => [item.label || item.month, item.newUsers ?? 0, item.cumulative ?? ""]),
      [],
      ["Категории проектов", ""],
      ["Категория", "Количество"],
      ...projectCategories.map((item) => [getProjectTypeLabel(item.category), item.count ?? 0]),
      [],
      ["Статусы проектов", ""],
      ["Статус", "Количество"],
      ...projectStatuses.map((item) => [getProjectStatusMeta(item.status).label, item.count ?? 0]),
    ],
    "admin_reports.csv"
  );
}

export default AdminPanel;
