const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const INDEX_PATH = path.join(ROOT, "index.html");
const VIDEO_PATH = path.join(ROOT, "New Project [C3E1D98].mp4");
const SPOTIFY_APP_ID = "shell:AppsFolder\\SpotifyAB.SpotifyMusic_zpdnekdrzrea0!Spotify";

function serveVideo(req, res) {
  fs.stat(VIDEO_PATH, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Video file not found");
      return;
    }

    const fileSize = stats.size;
    const range = req.headers.range;

    if (range) {
      const match = /bytes=(\d+)-(\d*)/.exec(range);
      if (!match) {
        res.writeHead(416, { "Content-Range": `bytes */${fileSize}` });
        res.end();
        return;
      }

      const start = Number(match[1]);
      const end = match[2] ? Math.min(Number(match[2]), fileSize - 1) : fileSize - 1;

      if (start >= fileSize || start > end) {
        res.writeHead(416, { "Content-Range": `bytes */${fileSize}` });
        res.end();
        return;
      }

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": end - start + 1,
        "Content-Type": "video/mp4",
      });
      fs.createReadStream(VIDEO_PATH, { start, end }).pipe(res);
      return;
    }

    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type": "video/mp4",
      "Accept-Ranges": "bytes",
    });
    fs.createReadStream(VIDEO_PATH).pipe(res);
  });
}

const STATIC_ASSETS = {
  "/spotify-logo.svg": { file: "spotify-logo.svg", type: "image/svg+xml" },
  "/spotify-icon-192.png": { file: "spotify-icon-192.png", type: "image/png" },
  "/spotify-icon-512.png": { file: "spotify-icon-512.png", type: "image/png" },
  "/manifest.webmanifest": { file: "manifest.webmanifest", type: "application/manifest+json; charset=utf-8" },
};

const server = http.createServer((req, res) => {
  const urlPath = (req.url || "/").split("?")[0];

  if (urlPath === "/" || urlPath === "/index.html") {
    fs.readFile(INDEX_PATH, (err, data) => {
      if (err) {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Failed to load index.html");
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(data);
    });
    return;
  }

  if (Object.prototype.hasOwnProperty.call(STATIC_ASSETS, urlPath)) {
    const asset = STATIC_ASSETS[urlPath];
    fs.readFile(path.join(ROOT, asset.file), (err, data) => {
      if (err) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Asset not found");
        return;
      }
      res.writeHead(200, { "Content-Type": asset.type });
      res.end(data);
    });
    return;
  }

  let decodedPath = urlPath;
  try {
    decodedPath = decodeURIComponent(urlPath);
  } catch {
    decodedPath = urlPath;
  }

  if (urlPath === "/video" || decodedPath === "/New Project [C3E1D98].mp4") {
    serveVideo(req, res);
    return;
  }

  if (urlPath === "/open-spotify" && req.method === "POST") {
    try {
      const child = spawn("explorer.exe", [SPOTIFY_APP_ID], {
        detached: true,
        stdio: "ignore",
      });
      child.unref();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
