import { io } from "socket.io-client";
import { getSessionToken } from "../utils/authSession";

export const createSocket = () => {
  const token = getSessionToken();
  const defaultSocketUrl = typeof window !== "undefined" ? window.location.origin : undefined;
  const socketUrl = process.env.REACT_APP_WS_BASE_URL || defaultSocketUrl;

  return io(socketUrl, {
    path: "/socket.io",
    auth: { token },
    transports: ["websocket"],
  });
};
