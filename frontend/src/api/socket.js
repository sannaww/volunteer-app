import { io } from "socket.io-client";

export const createSocket = () => {
  const token = sessionStorage.getItem("token"); // важно
  return io("http://localhost:5000", {
    auth: { token },
    transports: ["websocket"], // можно оставить, если у тебя так было
  });
};
