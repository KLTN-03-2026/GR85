import { io } from "socket.io-client";

let socketInstance = null;

export function connectChatSocket(token) {
  if (!token) {
    return null;
  }

  if (socketInstance?.connected) {
    return socketInstance;
  }

  socketInstance = io("http://localhost:3001", {
    path: "/socket.io",
    transports: ["websocket"],
    auth: {
      token,
    },
  });

  return socketInstance;
}

export function getChatSocket() {
  return socketInstance;
}

export function disconnectChatSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}
