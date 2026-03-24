module.exports = function requireUser(req, res, next) {
  const userId = req.headers["x-user-id"];

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized: x-user-id missing" });
  }

  // Совместимость со старым кодом
  req.user = { userId: Number(userId) };
  next();
};
