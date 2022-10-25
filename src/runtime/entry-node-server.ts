import "#internal/nitro/virtual/polyfill";
import { Server as HttpServer } from "http";
import type { AddressInfo } from "net";
import { Server as HttpsServer } from "https";
import destr from "destr";
import { toNodeListener } from "h3";

// @ts-ignore
import { useRuntimeConfig, useNitroApp } from "#internal/nitro";
import { createSocketServer } from "#entry_socket";

const nitroApp = useNitroApp();

const cert = process.env.NITRO_SSL_CERT;
const key = process.env.NITRO_SSL_KEY;

const server =
  cert && key
    ? new HttpsServer({ key, cert }, toNodeListener(nitroApp.h3App))
    : new HttpServer(toNodeListener(nitroApp.h3App));

createSocketServer(server);

const port = (destr(process.env.NITRO_PORT || process.env.PORT) ||
  3000) as number;
const host = process.env.NITRO_HOST || process.env.HOST;

// @ts-ignore
const s = server.listen(port, host, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  const protocol = cert && key ? "https" : "http";
  const i = s.address() as AddressInfo;
  const baseURL = (useRuntimeConfig().app.baseURL || "").replace(/\/$/, "");
  const url = `${protocol}://${
    i.family === "IPv6" ? `[${i.address}]` : i.address
  }:${i.port}${baseURL}`;
  console.log(`Listening ${url}`);
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

export default {};
