import api from "./client";

export async function canReview(projectId) {
  const res = await api.get(`/api/applications/can-review/${projectId}`);
  return res.data; // { canReview: true/false }
}
