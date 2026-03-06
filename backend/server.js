const http = require("http");

const app = require("./app");

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

if (app.socketIoProxy?.upgrade) {
  server.on("upgrade", (req, socket, head) => {
    if (req.url?.startsWith("/socket.io")) {
      app.socketIoProxy.upgrade(req, socket, head);
    }
  });
}

server.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
});
