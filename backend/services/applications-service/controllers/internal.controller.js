const prisma = require('../prismaClient');

exports.checkApproved = async (req, res) => {
  try {
    const userIdRaw = req.query.userId;
    const projectIdRaw = req.query.projectId;

    if (!userIdRaw || !projectIdRaw) {
      return res.status(400).json({ message: "userId и projectId обязательны" });
    }

    const userId = Number(userIdRaw);
    const projectId = Number(projectIdRaw);

    if (Number.isNaN(userId)) {
      return res.status(400).json({ message: "userId должен быть числом" });
    }
    if (Number.isNaN(projectId)) {
      return res.status(400).json({ message: "projectId должен быть числом" });
    }

    const exists = await prisma.application.findFirst({
      where: {
        userId,      // ✅ Int
        projectId,   // ✅ Int
        status: "APPROVED",
      },
      select: { id: true },
    });

    return res.json({ canReview: !!exists });
  } catch (err) {
    console.error("checkApproved error:", err);
    return res.status(500).json({ message: "Server error", details: err.message });
  }
};