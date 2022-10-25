import { Server } from "socket.io";

export default (server: Server) => {
  server.on("connect", (socket) => {
    console.log(`socket connected: ${socket.id}`);
    socket.on("disconnect", (reason) => {
      console.log(`socket disconnected: ${reason}`);
      server.emit("user disconnected", socket.id);
    });
  });
};
