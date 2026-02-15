import { io } from "socket.io-client";

export function createSocket() {
  const token = localStorage.getItem("token");

  // подключаемся к gateway (5000), он проксирует /socket.io на 5003
  const socket = io("http://localhost:5000", {
    transports: ["websocket"],
    auth: { token }, // ✅ сюда кладём JWT
  });

  return socket;
}
