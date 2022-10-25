import { type Server } from "socket.io";

let global_server: Server;

export function provideSocketServer(server: Server) {
  global_server = server;
}

export function useSocketServer() {
  return global_server;
}
