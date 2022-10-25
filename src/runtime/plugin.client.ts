import { defineNuxtPlugin } from "nuxt/app";
import SocketIO from "socket.io-client";

import { type Socket } from "socket.io-client";
import {
  type ClientToServerEvents,
} from "#build/types/socket";

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig().public.socket;
  const io: Socket<any, ClientToServerEvents> = config.port
    ? SocketIO(`${location.protocol}//${location.hostname}:${config.port}`)
    : SocketIO();

  io.on("connect", () => {
    console.log("connect");
  });

  return {
    provide: { io },
  };
});
