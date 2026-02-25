import api from "./client";

export async function getReviews(projectId) {
  const res = await api.get(`/api/projects/reviews/${projectId}`);
  return res.data;
}

export async function createReview(projectId, payload) {
  const res = await api.post(`/api/projects/reviews/${projectId}`, payload);
  return res.data;
}
