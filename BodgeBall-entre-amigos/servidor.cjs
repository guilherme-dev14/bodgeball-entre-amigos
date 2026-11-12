"use strict";
const http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path"),
  { spawn } = require("node:child_process");
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".glb": "model/gltf-binary",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm",
};
function createServer({ root = __dirname } = {}) {
  const ROOT = path.resolve(root);
  return http.createServer(async (req, res) => {
    try {
      if (!["GET", "HEAD"].includes(req.method)) {
        res.writeHead(405, { Allow: "GET, HEAD" });
        res.end();
        return;
      }
      const pathname = decodeURIComponent(
        new URL(req.url, "http://127.0.0.1").pathname,
      );
      if (pathname === "/status") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ app: "bodgeball-local", version: 1 }));
        return;
      }
      const relative =
        pathname === "/" ? "abrir.html" : pathname.replace(/^\/+/, "");
      if (relative !== "abrir.html" && !relative.startsWith("jogo/")) {
        res.writeHead(404);
        res.end();
        return;
      }
      let file = path.resolve(ROOT, relative);
      if (
        !file.startsWith(ROOT + path.sep) ||
        (relative.startsWith("jogo/") &&
          !file.startsWith(path.join(ROOT, "jogo") + path.sep))
      ) {
        res.writeHead(403);
        res.end();
        return;
      }
      let stat = await fs.promises.stat(file);
      if (stat.isDirectory()) {
        file = path.join(file, "index.html");
        stat = await fs.promises.stat(file);
      }
      if (!stat.isFile()) {
        res.writeHead(404);
        res.end();
        return;
      }
      const headers = {
        "Content-Type": MIME[path.extname(file)] || "application/octet-stream",
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
      };
      let start = 0,
        end = stat.size - 1,
        status = 200;
      if (req.headers.range) {
        const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
        if (!m || (!m[1] && !m[2])) {
          res.writeHead(416);
          res.end();
          return;
        }
        start = m[1] ? Number(m[1]) : Math.max(0, stat.size - Number(m[2]));
        end =
          m[1] && m[2] ? Math.min(Number(m[2]), stat.size - 1) : stat.size - 1;
        if (
          !Number.isSafeInteger(start) ||
          !Number.isSafeInteger(end) ||
          start > end ||
          start >= stat.size
        ) {
          res.writeHead(416, { "Content-Range": `bytes */${stat.size}` });
          res.end();
          return;
        }
        status = 206;
        headers["Content-Range"] = `bytes ${start}-${end}/${stat.size}`;
      }
      headers["Content-Length"] = Math.max(0, end - start + 1);
      res.writeHead(status, headers);
      if (req.method === "HEAD" || stat.size === 0) {
        res.end();
        return;
      }
      const stream = fs.createReadStream(file, { start, end });
      stream.on("error", () => res.destroy());
      res.on("close", () => stream.destroy());
      stream.pipe(res);
    } catch (e) {
      if (process.argv.includes("--debug"))
        console.error(req.url, e.code || e.message);
      if (!res.headersSent) res.writeHead(e.code === "ENOENT" ? 404 : 400);
      res.end();
    }
  });
}
function openBrowser(url) {
  let child;
  if (process.platform === "win32") {
    const candidates = [
      path.join(
        process.env.ProgramFiles || "C:\\Program Files",
        "Google/Chrome/Application/chrome.exe",
      ),
      path.join(
        process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)",
        "Microsoft/Edge/Application/msedge.exe",
      ),
      path.join(
        process.env.LOCALAPPDATA || "",
        "Google/Chrome/Application/chrome.exe",
      ),
    ];
    const exe = candidates.find((p) => fs.existsSync(p));
    child = exe
      ? spawn(exe, [url], { detached: true, stdio: "ignore" })
      : spawn("cmd.exe", ["/c", "start", "", url], {
          detached: true,
          stdio: "ignore",
        });
  } else
    child = spawn(process.platform === "darwin" ? "open" : "xdg-open", [url], {
      detached: true,
      stdio: "ignore",
    });
  child.on("error", () =>
    console.log("Abra o endereco acima no Chrome ou Edge."),
  );
  child.unref();
}
if (require.main === module) {
  let port = 5182;
  const server = createServer();
  server.on("error", (e) => {
    if (e.code === "EADDRINUSE" && port < 5192) {
      server.listen(++port, "127.0.0.1");
      return;
    }
    console.error("Nao foi possivel abrir o jogo:", e.message);
    process.exitCode = 1;
  });
  server.on("listening", () => {
    const url = `http://127.0.0.1:${port}/`;
    console.log(
      "\nBODGEBALL - ENTRE AMIGOS\n" +
        url +
        "\n\nMantenha esta janela aberta. A partida conecta pela internet.\nCompartilhe o CODIGO DA SALA, nao este endereco local.\nCtrl+C encerra o carregador local.\n",
    );
    if (!process.argv.includes("--no-open")) openBrowser(url);
  });
  server.listen(port, "127.0.0.1");
}
module.exports = { createServer };
