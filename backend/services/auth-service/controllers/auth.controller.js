const authService = require('../services/auth.service');

/**POST /api/auth/register*/
async function register(req, res) {
  try {
    const user = await authService.registerUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    // ✅ если пользователь уже существует — 409
    const msg = String(error.message || "");
    if (msg.toLowerCase().includes("уже существует")) {
      return res.status(409).json({ message: error.message });
    }
    return res.status(400).json({ message: error.message });
  }
}


/**POST /api/auth/login*/
async function login(req, res) {
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser(email, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
}

/**GET /api/auth/me*/
async function getMe(req, res) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const user = await authService.getMe(token);
    res.json(user);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
}

/** PUT /profile*/
async function updateProfile(req, res) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const updatedUser = await authService.updateProfile(token, req.body);
    res.json(updatedUser);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

/**GET /api/auth/users/:id  Используется другими сервисами (чат)*/
async function getUserById(req, res) {
  try {
    const userId = Number(req.params.id);
    if (!userId) {
      return res.status(400).json({ message: 'Некорректный id пользователя' });
    }

    const user = await authService.getUserById(userId);

    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}
/** DELETE /api/auth/account */
async function deleteAccount(req, res) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const result = await authService.deleteAccount(token);
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}


module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  getUserById,
  deleteAccount,
};
