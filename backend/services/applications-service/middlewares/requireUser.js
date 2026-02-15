module.exports = function requireUser(req, res, next) {
  const userId = req.headers["x-user-id"];

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized: x-user-id missing" });
  }

  // чтобы твой код работал как раньше (req.user.userId)
  req.user = { userId: Number(userId) };
  next();
};
