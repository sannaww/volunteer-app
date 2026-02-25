const path = require("path");

const clientPath = path.join(__dirname, "..", "..", "node_modules", "@prisma", "client");
const { PrismaClient } = require(clientPath);

module.exports = new PrismaClient();
