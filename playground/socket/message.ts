import { Socket } from "socket.io";

export default function (socket: Socket, message: string) {
  const server = useSocketServer();
  server.emit("message", message);
}
