const authService = require('../services/auth.service');

/**
 * POST /api/auth/register
 */
async function register(req, res) {
  try {
    const user = await authService.registerUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

/**
 * POST /api/auth/login
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser(email, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
}

/**
 * GET /api/auth/me
 */
async function getMe(req, res) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const user = await authService.getMe(token);
    res.json(user);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
}

/**
 * PUT /api/auth/profile
 */
async function updateProfile(req, res) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const updatedUser = await authService.updateProfile(token, req.body);
    res.json(updatedUser);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

module.exports = {
  register,
  login,
  getMe,
  updateProfile
};
