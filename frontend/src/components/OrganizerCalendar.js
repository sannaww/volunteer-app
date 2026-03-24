import React, { useEffect, useMemo, useState } from "react";
import { getOrganizerCalendar, updateProject } from "../api/calendar";

// Переводы статусов
const STATUS_LABELS = {
  ACTIVE: "Активный",
  DRAFT: "Черновик",
  CANCELLED: "Отменён",
  COMPLETED: "Завершён",
};

// Переводы типов проекта
const PROJECT_TYPE_LABELS = {
  ECOLOGY: "Экология",
  ANIMAL_WELFARE: "Защита животных",
  EDUCATION: "Образование",
  SOCIAL: "Социальный",
  CULTURAL: "Культурный",
  SPORTS: "Спортивный",
  MEDICAL: "Медицинский",
  OTHER: "Другое",
};

function pad2(n) { return String(n).padStart(2, "0"); }
function monthStr(date) { return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`; }
function weekdayMon0(date) { const d = date.getDay(); return (d + 6) % 7; } // пн=0
function startOfWeekMon(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
  d.setDate(d.getDate() - weekdayMon0(d));
  return d;
}
function addDays(date, days) { const d = new Date(date); d.setDate(d.getDate() + days); return d; }
function sameYMD(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function clampDateToDay(date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0); }
function isOverlap(aStart, aEnd, bStart, bEnd) { return aStart <= bEnd && aEnd >= bStart; }
function formatDateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
function formatTimeOnly(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
function formatDateShort(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}`;
}
function toLocalInputValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
function fromLocalInputValue(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}
function statusStyle(status) {
  const s = String(status || "").toUpperCase();
  if (s === "ACTIVE") return { borderColor: "#b7f0c2", background: "#f3fff6" };
  if (s === "DRAFT") return { borderColor: "#e5e5e5", background: "#fafafa" };
  if (s === "CANCELLED") return { borderColor: "#ffd0d0", background: "#fff5f5" };
  if (s === "COMPLETED") return { borderColor: "#d7e7ff", background: "#f5f9ff" };
  return { borderColor: "#eaeaea", background: "#ffffff" };
}

// Modal
function EditEventModal({ open, project, onClose, onSaved }) {
  const [startValue, setStartValue] = useState("");
  const [endValue, setEndValue] = useState("");
  const [location, setLocation] = useState("");
  const [volunteersRequired, setVolunteersRequired] = useState(1);
  const [contactInfo, setContactInfo] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!project) return;
    setStartValue(toLocalInputValue(project.startDate));
    setEndValue(toLocalInputValue(project.endDate));
    setLocation(project.location || "");
    setVolunteersRequired(project.volunteersRequired ?? 1);
    setContactInfo(project.contactInfo || "");
    setError("");
    setSaving(false);
  }, [project]);

  if (!open || !project) return null;

  const validate = () => {
    const startIso = fromLocalInputValue(startValue);
    const endIso = fromLocalInputValue(endValue);

    if (!startIso && !endIso) return { startIso: null, endIso: null };
    if (!startIso || !endIso) throw new Error("Нужно заполнить обе даты: начало и конец");
    if (new Date(startIso) > new Date(endIso)) throw new Error("Дата начала не может быть позже даты окончания");
    return { startIso, endIso };
  };

  const onSave = async () => {
    setError("");
    setSaving(true);
    try {
      const { startIso, endIso } = validate();
      const payload = {
        startDate: startIso,
        endDate: endIso,
        location: location.trim() || null,
        volunteersRequired: Number(volunteersRequired) || 1,
        contactInfo: contactInfo.trim() || null,
      };
      await updateProject(project.id, payload);
      onSaved();
      onClose();
    } catch (e) {
      const msg = e.response?.data?.error || e.response?.data?.message || e.message || "Ошибка сохранения";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 9999 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(720px, 100%)", background: "#fff", borderRadius: 16, padding: 16, border: "1px solid #eee" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <h3 style={{ margin: 0 }}>{project.title}</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <div style={{ marginTop: 8, opacity: 0.8 }}>Статус: <b>{STATUS_LABELS[project.status] || project.status}</b></div>
        {error && <div style={{ marginTop: 12, padding: 10, border: "1px solid #f99", borderRadius: 12 }}>{error}</div>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
          <div>
            <label>Начало</label>
            <input type="datetime-local" value={startValue} onChange={(e) => setStartValue(e.target.value)} style={{ width: "100%" }} disabled={saving} />
          </div>
          <div>
            <label>Окончание</label>
            <input type="datetime-local" value={endValue} onChange={(e) => setEndValue(e.target.value)} style={{ width: "100%" }} disabled={saving} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label>Локация</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} style={{ width: "100%" }} disabled={saving} placeholder="например: Москва, парк Горького" />
          </div>
          <div>
            <label>Требуется волонтёров</label>
            <input type="number" min="1" value={volunteersRequired} onChange={(e) => setVolunteersRequired(e.target.value)} style={{ width: "100%" }} disabled={saving} />
          </div>
          <div>
            <label>Контакты</label>
            <input value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} style={{ width: "100%" }} disabled={saving} placeholder="телефон/почта" />
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
          <button onClick={onClose} disabled={saving}>Отмена</button>
          <button onClick={onSave} disabled={saving}>{saving ? "Сохранение..." : "Сохранить"}</button>
        </div>
        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>Можно очистить обе даты, оставив поля пустыми (если проект в черновике).</div>
      </div>
    </div>
  );
}

export default function OrganizerCalendar() {
  const [cursor, setCursor] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState("");
  const [calendarMode, setCalendarMode] = useState(""); // admin_all_projects | organizer_own_projects

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [showDrafts, setShowDrafts] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [selected, setSelected] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const m = useMemo(() => monthStr(cursor), [cursor]);
  const MAX_LANES = 5;
  const LANE_HEIGHT = 76;

  const loadMonth = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getOrganizerCalendar(m);
      setProjects(data.projects || []);
      setCalendarMode(data.mode || "");
    } catch (e) {
      setError(e.response?.data?.error || e.response?.data?.message || "Ошибка загрузки календаря");
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadMonth(); }, [m]);

  const availableTypes = useMemo(() => {
    const set = new Set();
    for (const p of projects) if (p.projectType) set.add(p.projectType);
    return Array.from(set).sort();
  }, [projects]);

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      const st = String(p.status || "").toUpperCase();
      const tp = String(p.projectType || "");
      if (!showDrafts && st === "DRAFT") return false;
      if (statusFilter !== "ALL" && st !== statusFilter) return false;
      if (typeFilter !== "ALL" && tp !== typeFilter) return false;
      if (!q) return true;
      const hay = `${p.title || ""} ${p.location || ""} ${p.contactInfo || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [projects, search, typeFilter, showDrafts, statusFilter]);

  const weeks = useMemo(() => {
    const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1, 0, 0, 0);
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59);
    const firstWeekStart = startOfWeekMon(monthStart);
    const lastWeekStart = startOfWeekMon(monthEnd);
    const result = [];
    let cur = new Date(firstWeekStart);
    while (cur <= lastWeekStart) {
      const weekStart = new Date(cur);
      const weekEnd = addDays(weekStart, 6);
      result.push({ weekStart, weekEnd });
      cur = addDays(cur, 7);
    }
    return result;
  }, [cursor]);

  const weekBars = useMemo(() => {
    const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1, 0, 0, 0);
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59);

    const getCol = (date, weekStart) => {
      const d0 = clampDateToDay(weekStart);
      const d1 = clampDateToDay(date);
      const diff = Math.floor((d1 - d0) / (1000 * 60 * 60 * 24));
      return Math.min(6, Math.max(0, diff));
    };

    const barsByWeek = weeks.map(() => []);

    for (const p of filteredProjects) {
      if (!p.startDate || !p.endDate) continue;
      const ps = new Date(p.startDate);
      const pe = new Date(p.endDate);
      const clampedS = ps < monthStart ? monthStart : ps;
      const clampedE = pe > monthEnd ? monthEnd : pe;

      weeks.forEach((w, wi) => {
        if (!isOverlap(clampedS, clampedE, w.weekStart, w.weekEnd)) return;
        const segStart = clampedS < w.weekStart ? w.weekStart : clampedS;
        const segEnd = clampedE > w.weekEnd ? w.weekEnd : clampedE;
        barsByWeek[wi].push({
          project: p,
          colStart: getCol(segStart, w.weekStart),
          colEnd: getCol(segEnd, w.weekStart),
          isStart: ps >= w.weekStart && ps <= w.weekEnd,
          isEnd: pe >= w.weekStart && pe <= w.weekEnd,
        });
      });
    }

    return barsByWeek.map((bars) => {
      bars.sort((a, b) => a.colStart - b.colStart || a.colEnd - b.colEnd);
      const lanes = [];
      for (const bar of bars) {
        let placed = false;
        for (const lane of lanes) {
          const last = lane[lane.length - 1];
          if (bar.colStart > last.colEnd) {
            lane.push(bar);
            placed = true;
            break;
          }
        }
        if (!placed) lanes.push([bar]);
      }
      return lanes;
    });
  }, [filteredProjects, weeks, cursor]);

  const prev = () => setCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const next = () => setCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const openEdit = (p) => { setSelected(p); setIsModalOpen(true); };

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <button onClick={prev}>←</button>
        <h2 style={{ margin: 0 }}>Календарь мероприятий ({m})</h2>
        <button onClick={next}>→</button>
      </div>

      {calendarMode === "admin_all_projects" && (
        <div style={{ marginBottom: 10, padding: "8px 12px", border: "1px solid #dbe7ff", background: "#f5f9ff", borderRadius: 12, fontSize: 13 }}>
          Режим администратора: отображаются <b>все проекты</b>.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 10, padding: 12, border: "1px solid #eee", borderRadius: 14, marginBottom: 12, background: "#fff" }}>
        <input placeholder="Поиск по названию/локации/контактам..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="ALL">Все типы</option>
          {availableTypes.map((t) => (<option key={t} value={t}>{PROJECT_TYPE_LABELS[t] || t}</option>))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="ALL">Все статусы</option>
          <option value="ACTIVE">{STATUS_LABELS.ACTIVE}</option>
          <option value="DRAFT">{STATUS_LABELS.DRAFT}</option>
          <option value="CANCELLED">{STATUS_LABELS.CANCELLED}</option>
          <option value="COMPLETED">{STATUS_LABELS.COMPLETED}</option>
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 8, userSelect: "none" }}>
          <input type="checkbox" checked={showDrafts} onChange={(e) => setShowDrafts(e.target.checked)} />
          Показывать черновики
        </label>
      </div>

      {error && <div style={{ padding: 10, border: "1px solid #f99", borderRadius: 12 }}>{error}</div>}
      {loading && <div>Загрузка...</div>}

      {!loading && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, marginBottom: 8 }}>
            {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((w) => (
              <div key={w} style={{ fontWeight: 700, padding: 6 }}>{w}</div>
            ))}
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {weeks.map((w, wi) => {
              const days = Array.from({ length: 7 }, (_, i) => addDays(w.weekStart, i));
              const lanes = weekBars[wi] || [];

              return (
                <div key={wi} style={{ border: "1px solid #e9e9e9", borderRadius: 14, background: "#fff", overflow: "hidden", padding: 10, position: "relative" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
                    {days.map((d, idx) => {
                      const inMonth = d.getMonth() === cursor.getMonth();
                      const isToday = sameYMD(d, new Date());
                      const isWeekend = idx >= 5;
                      return (
                        <div key={idx} style={{ minHeight: 140, border: "1px solid #f0f0f0", borderRadius: 12, padding: 8, background: inMonth ? (isWeekend ? "#fcfcfc" : "#fff") : "#fafafa", opacity: inMonth ? 1 : 0.6 }}>
                          <div style={{ fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 999, border: isToday ? "1px solid #bdbdbd" : "1px solid transparent" }} title={isToday ? "Сегодня" : ""}>
                            {d.getDate()}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ position: "absolute", left: 10, right: 10, top: 46, pointerEvents: "none" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
                      {Array.from({ length: Math.min(MAX_LANES, lanes.length) * 7 }).map((_, i) => (
                        <div key={i} style={{ height: LANE_HEIGHT }} />
                      ))}

                      {lanes.slice(0, MAX_LANES).map((lane, laneIndex) =>
                        lane.map((bar) => {
                          const p = bar.project;
                          const st = statusStyle(p.status);
                          const leftMark = bar.isStart ? "" : "◀ ";
                          const rightMark = bar.isEnd ? "" : " ▶";
                          return (
                            <div
                              key={`bar-${wi}-${laneIndex}-${p.id}-${bar.colStart}-${bar.colEnd}`}
                              title={`${p.title}\n${formatDateTime(p.startDate)} - ${formatDateTime(p.endDate)}\n${p.location || ""}\n${STATUS_LABELS[p.status] || p.status}`}
                              style={{
                                pointerEvents: "auto",
                                gridColumn: `${bar.colStart + 1} / ${bar.colEnd + 2}`,
                                gridRow: laneIndex + 1,
                                height: 100,
                                lineHeight: 1.2,
                                borderRadius: 12,
                                border: `1px solid ${st.borderColor}`,
                                background: st.background,
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "flex-start",
                                alignItems: "flex-start",
                                padding: "6px 8px",
                                fontSize: 12,
                                cursor: "pointer",
                                overflow: "hidden",
                              }}
                              onClick={(e) => { e.stopPropagation(); openEdit(p); }}
                            >
                              <div style={{ fontWeight: 800, width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {leftMark}{p.title}{rightMark}
                              </div>
                              <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>
                                {formatDateShort(p.startDate)} {formatTimeOnly(p.startDate)} — {formatDateShort(p.endDate)} {formatTimeOnly(p.endDate)}
                              </div>
                              {p.location && (
                                <div style={{ fontSize: 11, opacity: 0.8, width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  📍 {p.location}
                                </div>
                              )}
                              <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>
                                {STATUS_LABELS[p.status] || p.status}
                                {p.projectType ? ` · ${PROJECT_TYPE_LABELS[p.projectType] || p.projectType}` : ""}
                                {typeof p.volunteersRequired === "number" ? ` · 👥 ${p.volunteersRequired}` : ""}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {lanes.length > MAX_LANES && (
                      <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
                        + ещё {lanes.length - MAX_LANES} событий (часть скрыта)
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <EditEventModal open={isModalOpen} project={selected} onClose={() => setIsModalOpen(false)} onSaved={loadMonth} />
    </div>
  );
}
