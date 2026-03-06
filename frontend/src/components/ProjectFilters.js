import React, { useEffect, useState } from "react";

import { PROJECT_TYPE_OPTIONS, PROJECT_STATUS_META } from "../utils/presentation";
import Icon from "./ui/Icon";
import "./ProjectFilters.css";

const STATUS_OPTIONS = [
  { value: "", label: "Все статусы" },
  { value: "ACTIVE", label: PROJECT_STATUS_META.ACTIVE.label },
  { value: "COMPLETED", label: PROJECT_STATUS_META.COMPLETED.label },
  { value: "CANCELLED", label: PROJECT_STATUS_META.CANCELLED.label },
];

function ProjectFilters({ filters, onFiltersChange, onReset }) {
  const [localFilters, setLocalFilters] = useState({
    search: filters.search || "",
    projectType: filters.projectType || "",
    location: filters.location || "",
    dateFrom: filters.dateFrom || "",
    dateTo: filters.dateTo || "",
    status: filters.status || "",
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    setLocalFilters({
      search: filters.search || "",
      projectType: filters.projectType || "",
      location: filters.location || "",
      dateFrom: filters.dateFrom || "",
      dateTo: filters.dateTo || "",
      status: filters.status || "",
    });
  }, [filters]);

  const handleFilterChange = (key, value) => {
    setLocalFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
  };

  const handleReset = () => {
    setLocalFilters({
      search: "",
      projectType: "",
      location: "",
      dateFrom: "",
      dateTo: "",
      status: "",
    });
    onReset();
  };

  return (
    <div className="project-filters">
      <div className="filters-header">
        <div className="search-box">
          <input
            type="text"
            placeholder="Поиск по названию и описанию"
            value={localFilters.search}
            onChange={(event) => handleFilterChange("search", event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && handleApplyFilters()}
          />
          <button className="search-btn" type="button" onClick={handleApplyFilters} aria-label="Применить поиск">
            <Icon name="search" />
          </button>
        </div>

        <button className="toggle-filters-btn" type="button" onClick={() => setShowFilters((prev) => !prev)}>
          <Icon name={showFilters ? "expand_less" : "tune"} />
          <span>{showFilters ? "Скрыть расширенные фильтры" : "Открыть расширенные фильтры"}</span>
        </button>
      </div>

      {showFilters ? (
        <div className="filters-panel">
          <div className="filters-grid">
            <div className="filter-group">
              <label htmlFor="filter-status">Статус</label>
              <select
                id="filter-status"
                value={localFilters.status}
                onChange={(event) => handleFilterChange("status", event.target.value)}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="filter-project-type">Тип проекта</label>
              <select
                id="filter-project-type"
                value={localFilters.projectType}
                onChange={(event) => handleFilterChange("projectType", event.target.value)}
              >
                <option value="">Все типы</option>
                {PROJECT_TYPE_OPTIONS.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="filter-location">Локация</label>
              <input
                id="filter-location"
                type="text"
                placeholder="Город или адрес"
                value={localFilters.location}
                onChange={(event) => handleFilterChange("location", event.target.value)}
              />
            </div>

            <div className="filter-group">
              <label htmlFor="filter-date-from">Дата с</label>
              <input
                id="filter-date-from"
                type="date"
                value={localFilters.dateFrom}
                onChange={(event) => handleFilterChange("dateFrom", event.target.value)}
              />
            </div>

            <div className="filter-group">
              <label htmlFor="filter-date-to">Дата по</label>
              <input
                id="filter-date-to"
                type="date"
                value={localFilters.dateTo}
                onChange={(event) => handleFilterChange("dateTo", event.target.value)}
              />
            </div>
          </div>

          <div className="filter-actions">
            <button className="btn btn-primary" type="button" onClick={handleApplyFilters}>
              Применить фильтры
            </button>
            <button className="btn btn-secondary" type="button" onClick={handleReset}>
              Сбросить
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default ProjectFilters;
