import api from "./client";

// month = "YYYY-MM"
export const getOrganizerCalendar = async (month) => {
  const { data } = await api.get(`/api/projects/organizer/calendar?month=${month}`);
  return data;
};

export const updateProject = async (id, payload) => {
  const { data } = await api.put(`/api/projects/${id}`, payload);
  return data;
};
