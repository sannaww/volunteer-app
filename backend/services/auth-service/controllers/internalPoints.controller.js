const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.addPoints = async (req, res) => {
  try {
    const { userId, points, reason } = req.body;

    const userIdInt = Number(userId);
    const pointsInt = Number(points);

    if (Number.isNaN(userIdInt)) return res.status(400).json({ message: "userId должен быть числом" });
    if (Number.isNaN(pointsInt) || pointsInt <= 0) return res.status(400).json({ message: "points должен быть > 0" });

    const updated = await prisma.user.update({
      where: { id: userIdInt },
      data: { points: { increment: pointsInt } },
      select: { id: true, points: true },
    });

    return res.json({ ok: true, user: updated, reason: reason || null });
  } catch (err) {
    console.error("addPoints error:", err);
    return res.status(500).json({ message: "Server error", details: err.message });
  }
};
