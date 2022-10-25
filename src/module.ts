import * as Pathe from "pathe";
import { BroadcastChannel } from "worker_threads";
import { type ProxyTarget } from "http-proxy";
import HttpProxy from "http-proxy";
import { AddressInfo } from "net";
import { existsSync, readdirSync } from "fs";

import {
  defineNuxtModule,
  createResolver,
  useNuxt,
  addPlugin,
  addImports,
  useLogger,
  addTemplate,
} from "@nuxt/kit";

export interface ModuleOptions {
  dev: { port: number };
}

export interface ClientToServerEvents {}
export interface ServerToClientEvents {}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: "@tgnu/socket-test",
    configKey: "socket",
  },
  defaults: {
    dev: {
      port: 3001,
    },
  },
  async setup(options, nuxt) {
    const { srcDir, dev } = nuxt.options;
    const resolver = createResolver(import.meta.url);
    const proxy_target: ProxyTarget = { host: "", port: 0 };
    const socket_handler = resolver.resolve(srcDir, "socket", "index.ts");

    nuxt.options.runtimeConfig.public.socket = {
      port: dev ? options.dev.port : undefined,
    };

    createProxy(options.dev.port, proxy_target);

    onWorkerAdressChange((address) => {
      proxy_target.host = address.address;
      proxy_target.port = address.port;
    });

    /* changeEntry(
      resolver.resolve("runtime", "entry-node-server"),
      resolver.resolve("runtime", "entry-nitro-dev")
    ); */

    addPlugin(
      resolver.resolve("runtime", "plugin.client") //
    );

    setAlliasIfExist(
      "#socket_index",
      socket_handler,
      resolver.resolve("runtime", "empty-socket-index")
    );

    addImports({
      from: resolver.resolve("runtime", "auto-import"),
      name: "provideSocketServer",
    });

    const socket_dir = resolver.resolve(srcDir, "socket");
    const entry_socket = resolver.resolve("runtime", "entry-socket");

    nuxt.options.alias["#entry_socket"] = entry_socket;
    nuxt.options.alias["#socket/module"] = resolver.resolve("module");
    nuxt.options.alias["#socket-dir"] = socket_dir;

    nuxt.options.nitro.virtual = nuxt.options.nitro.virtual ?? {};
    nuxt.options.nitro.alias = nuxt.options.nitro.alias ?? {};

    nuxt.hook("nitro:config", (config) => {
      config.alias["#socket-dir"] = socket_dir;

      config.imports = config.imports || {};
      config.imports.imports = config.imports.imports || [];

      config.imports.imports.push({
        from: resolver.resolve("runtime", "auto-import"),
        name: "useSocketServer",
      });
    });

    const { dst: types_socket_d_ts } = addTemplate({
      filename: "types/socket.d.ts",
      write: true,
      getContents() {
        const imports_lines = [] as string[];

        function readDir(root: string, path = "") {
          const dir = Pathe.join(root, path);
          const files = readdirSync(dir, {
            withFileTypes: true,
          });
          const prefix = !path ? "" : `${path}/`;
          for (const file of files) {
            if (file.isDirectory()) {
              readDir(root, Pathe.join(path, file.name));
            }
            if (file.isFile()) {
              const { name } = Pathe.parse(file.name);
              const fullpath = Pathe.resolve(dir, name);

              imports_lines.push(
                `    '${prefix}${name}': FunctionWithoutFirstParameter<typeof import("${fullpath}")["default"]>;`
              );
            }
          }
        }

        readDir(socket_dir);

        const lines = [] as string[];

        lines.push(
          "",
          "type RemoveFirst<T> = T extends [any, ...infer Z] ? Z : never;",
          "type RemoveFirstParameter<T extends (...args: any[]) => any> =",
          "  RemoveFirst<Parameters<T>>;",
          "type FunctionWithoutFirstParameter<T extends (...args: any[]) => any> = (",
          "  ...args: RemoveFirstParameter<T>",
          ") => void;",
          "",
          "export interface ClientToServerEvents {",
          ...imports_lines,
          "}",
          "export interface ServerToClientEvents {",
          "}",
          ""
        );

        return lines.join("\n");
      },
    });

    nuxt.hook("prepare:types", (options) => {
      options.references.push({
        path: types_socket_d_ts,
      });
    });

    nuxt.options.nitro.virtual["#socket-test"] = () => {
      const imports_lines = [] as string[];
      const events_lines = [] as string[];

      function readDir(root: string, path = "") {
        const dir = Pathe.join(root, path);
        const files = readdirSync(dir, {
          withFileTypes: true,
        });
        const prefix = !path ? "" : `${path}/`;
        for (const file of files) {
          if (file.isDirectory()) {
            readDir(root, Pathe.join(path, file.name));
          }
          if (file.isFile()) {
            const { name } = Pathe.parse(file.name);
            const index = imports_lines.length + 1;

            imports_lines.push(
              `import Import${index} from "#socket-dir/${prefix}${file.name}";`
            );

            events_lines.push(`    ['${prefix}${name}']: Import${index},`);
          }
        }
      }

      readDir(socket_dir);

      const lines = [] as string[];

      lines.push(...imports_lines);
      lines.push("");
      lines.push("export function getEvents() {");
      lines.push("  return {");
      lines.push(...events_lines);
      lines.push("  };");
      lines.push("};");

      return lines.join("\n");
    };
  },
});

function changeEntry(prod_entry: string, dev_entry: string) {
  const nuxt = useNuxt();
  const entry = nuxt.options.dev ? dev_entry : prod_entry;

  nuxt.options.nitro.entry = entry;

  return entry;
}

function createProxy(port: number, target: ProxyTarget) {
  const nuxt = useNuxt();
  const proxy = HttpProxy.createProxyServer({ target, ws: true });

  proxy.on("error", function (e) {});

  nuxt.hook("listen", () => {
    proxy.listen(port);
  });

  nuxt.hook("close", () => {
    new Promise<void>((resolve) => {
      proxy.close(resolve);
    });
  });

  return proxy;
}

function onWorkerAdressChange(func: (address: AddressInfo) => void) {
  const logger = useLogger("tgnu:socket");
  const channel = new BroadcastChannel("tgnu:socket:channel");
  channel.onmessage = ({
    data,
  }: {
    data: { event: string; address: AddressInfo };
  }) => {
    if (!data || data.event !== "address-change") {
      return;
    }
    func(data.address);
    logger.success(`Worker port changed to ${data.address.port}`);
  };
}

function setAlliasIfExist(alias: string, path: string, default_path: string) {
  const nuxt = useNuxt();

  if (sourceFileExist(path)) {
    nuxt.options.alias[alias] = path;
  } else {
    nuxt.options.alias[alias] = default_path;
  }
}

function sourceFileExist(path: string) {
  return existsSync(path);
}
