import * as SocketIO from "socket.io";
import Http from "node:http";
import { BroadcastChannel } from "worker_threads";
import SocketIndex from "#socket_index";
import { provideSocketServer } from "./auto-import";

// @ts-ignore
import { getEvents } from "#socket-test";

export function createSocketServer(server?: Http.Server) {
  if (!server) {
    const channel = new BroadcastChannel("tgnu:socket:channel");
    server = Http.createServer();
    server.listen(0, () => {
      channel.postMessage({
        event: "address-change",
        address: server.address(),
      });
    });
  }

  const socket_server = new SocketIO.Server(server, {
    cors: {
      origin: true,
    },
  });

  provideSocketServer(socket_server);

  SocketIndex(socket_server);

  const events = getEvents();

  socket_server.on("connect", (socket) => {
    socket.onAny(async (event: string, ...data) => {
      const handler = events[event];
      if (handler) {
        handler.call(socket, socket, ...data);
      }
    });
  });

  return socket_server;
}
