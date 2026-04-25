import { io } from 'socket.io-client';

let socket = null;

export function getSocket(token) {
  // If token changed (e.g. re-login), destroy old socket and create fresh one
  if (socket && token && socket.auth?.token !== token) {
    socket.disconnect();
    socket = null;
  }
  if (!socket) {
    const host = window.location.hostname;
    socket = io(`http://${host}:5000`, {
      auth: { token },
      autoConnect: false,
      reconnection: true,
    });
  }
  return socket;
}

export function connectSocket(token) {
  const s = getSocket(token);
  if (!s.connected) {
    s.auth = { token };
    s.connect();
  }
  return s;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
