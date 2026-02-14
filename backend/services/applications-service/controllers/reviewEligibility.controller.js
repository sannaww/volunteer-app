const prisma = require("../prismaClient");

exports.canReview = async (req, res) => {
  try {
    const userIdHeader = req.headers["x-user-id"];
    const projectIdRaw = req.params.projectId;

    if (!userIdHeader) return res.status(401).json({ message: "Missing x-user-id" });

    const userId = Number(userIdHeader);
    const projectId = Number(projectIdRaw);

    if (Number.isNaN(userId)) return res.status(400).json({ message: "Некорректный userId" });
    if (Number.isNaN(projectId)) return res.status(400).json({ message: "Некорректный projectId" });

    const exists = await prisma.application.findFirst({
      where: { userId, projectId, status: "APPROVED" },
      select: { id: true },
    });

    return res.json({ canReview: !!exists });
  } catch (err) {
    console.error("canReview error:", err);
    return res.status(500).json({ message: "Server error", details: err.message });
  }
};
