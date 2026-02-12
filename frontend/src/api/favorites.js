import api from "./client";

export async function getFavorites() {
  const res = await api.get("/api/projects/favorites");
  return res.data;
}

export async function addFavorite(projectId) {
  const res = await api.post(`/api/projects/favorites/${projectId}`);
  return res.data;
}

export async function removeFavorite(projectId) {
  const res = await api.delete(`/api/projects/favorites/${projectId}`);
  return res.data;
}
