import "#internal/nitro/virtual/polyfill";
import { Server } from "http";
import { tmpdir } from "os";
import { join } from "path";
import { mkdirSync } from "fs";
import { threadId, parentPort } from "worker_threads";
import { isWindows, provider } from "std-env";
import { toNodeListener } from "h3";

// @ts-ignore
import { useNitroApp } from "#internal/nitro";
import { createSocketServer } from "#entry_socket";

const nitroApp = useNitroApp();

const server = new Server(toNodeListener(nitroApp.h3App));
// createSocketServer();

function getAddress() {
  if (provider === "stackblitz" || process.env.NITRO_NO_UNIX_SOCKET) {
    return "0";
  }
  const socketName = `worker-${process.pid}-${threadId}.sock`;
  if (isWindows) {
    return join("\\\\.\\pipe\\nitro", socketName);
  } else {
    const socketDir = join(tmpdir(), "nitro");
    mkdirSync(socketDir, { recursive: true });
    return join(socketDir, socketName);
  }
}

const listenAddress = getAddress();
server.listen(listenAddress, () => {
  const _address = server.address();
  parentPort.postMessage({
    event: "listen",
    address:
      typeof _address === "string"
        ? { socketPath: _address }
        : { host: "localhost", port: _address.port },
  });
});

if (process.env.DEBUG) {
  process.on("unhandledRejection", (err) =>
    console.error("[nitro] [dev] [unhandledRejection]", err)
  );
  process.on("uncaughtException", (err) =>
    console.error("[nitro] [dev] [uncaughtException]", err)
  );
} else {
  process.on("unhandledRejection", (err) =>
    console.error("[nitro] [dev] [unhandledRejection] " + err)
  );
  process.on("uncaughtException", (err) =>
    console.error("[nitro] [dev] [uncaughtException] " + err)
  );
}
