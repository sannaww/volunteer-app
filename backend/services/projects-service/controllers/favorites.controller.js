const prisma = require("../prismaClient");

// Приводим projectId
function normalizeProjectId(projectIdParam) {
  const asNumber = Number(projectIdParam);
  if (!Number.isNaN(asNumber) && projectIdParam !== "") return asNumber;

  return projectIdParam;
}

exports.addFavorite = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    const projectIdRaw = req.params.projectId;

    if (!userId) return res.status(401).json({ message: "Missing x-user-id" });
    if (!projectIdRaw) return res.status(400).json({ message: "Missing projectId" });

    const projectId = normalizeProjectId(projectIdRaw);

    // Проверяем проект
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Ищем существующую запись
    const existing = await prisma.favorite.findUnique({
      where: {
        userId_projectId: { userId: String(userId), projectId },
      },
      include: { project: true },
    });

    if (existing) {
      return res.status(200).json(existing);
    }

    const favorite = await prisma.favorite.create({
      data: { userId: String(userId), projectId },
      include: { project: true },
    });

    return res.status(201).json(favorite);
  } catch (err) {
    console.error("addFavorite error:", err);

    // Ошибки Prisma
    if (err.code === "P2002") {
      return res.status(409).json({ message: "Already in favorites" });
    }

    return res.status(500).json({
      message: "Server error",
      details: err.message,
    });
  }
};

// DELETE /favorites/:projectId
exports.removeFavorite = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    const projectIdRaw = req.params.projectId;

    if (!userId) return res.status(401).json({ message: "Missing x-user-id" });
    if (!projectIdRaw) return res.status(400).json({ message: "Missing projectId" });

    const projectId = normalizeProjectId(projectIdRaw);

    await prisma.favorite.delete({
      where: {
        userId_projectId: {
          userId: String(userId),
          projectId,
        },
      },
    });

    return res.json({ message: "Removed from favorites" });
  } catch (err) {
    console.error("removeFavorite error:", err);

    // Запись не найдена
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Favorite not found" });
    }

    return res.status(500).json({
      message: "Server error",
      details: err.message,
    });
  }
};
// GET /favorites
exports.getMyFavorites = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    if (!userId) return res.status(401).json({ message: "Missing x-user-id" });

    const favorites = await prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { project: true },
    });

    return res.json(favorites);
  } catch (err) {
    console.error("getMyFavorites error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
