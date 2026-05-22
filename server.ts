import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON body
  app.use(express.json());

  // SEO routes for search engines
  app.get("/robots.txt", (req, res) => {
    res.type("text/plain");
    res.send(
      "User-agent: *\n" +
      "Allow: /\n" +
      "Disallow: /api/\n" +
      "Disallow: /tiktok/api.php\n\n" +
      "Sitemap: https://tikloder.app/sitemap.xml"
    );
  });

  app.get("/sitemap.xml", (req, res) => {
    res.type("application/xml");
    res.send(
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      '  <url>\n' +
      '    <loc>https://tikloder.app/</loc>\n' +
      '    <lastmod>2026-05-22</lastmod>\n' +
      '    <changefreq>daily</changefreq>\n' +
      '    <priority>1.0</priority>\n' +
      '  </url>\n' +
      '</urlset>'
    );
  });

  // 1. TikTok fetch info endpoint - proxies calls to TikWM to prevent CORS and sanitize output
  app.get("/api/fetch", async (req, res) => {
    try {
      const { url } = req.query;
      if (!url || typeof url !== "string") {
        return res.status(400).json({ status: "error", message: "TikTok URL is required" });
      }

      const cleanUrl = url.trim();
      const requestUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(cleanUrl)}`;

      const response = await fetch(requestUrl, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`Downloader service responded with status ${response.status}`);
      }

      const result = await response.json();
      return res.json(result);
    } catch (error: any) {
      console.error("Fetch API error:", error);
      return res.status(500).json({
        status: "error",
        message: error.message || "Failed to process TikTok URL"
      });
    }
  });

  // 1.2 Compatible /tiktok/api.php endpoint as described in botcahx / tiktokdl-api documentation
  app.get("/tiktok/api.php", async (req, res) => {
    try {
      const { url } = req.query;
      if (!url || typeof url !== "string") {
        return res.status(400).json({ status: false, message: "TikTok URL is required" });
      }

      const cleanUrl = url.trim();
      const requestUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(cleanUrl)}`;

      const response = await fetch(requestUrl, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`Alternative solver responded with status ${response.status}`);
      }

      const result = await response.json();
      if (result.code !== 0 || !result.data) {
        return res.status(404).json({
          status: false,
          message: result.msg || "The video could not be found or processed"
        });
      }

      const d = result.data;
      
      // Clean prefix resolution just in case links are relative
      const sanitizeLink = (link: string) => {
        if (!link) return "";
        if (link.startsWith("http://") || link.startsWith("https://")) {
          return link;
        }
        return `https://www.tikwm.com${link.startsWith("/") ? "" : "/"}${link}`;
      };

      // Map to the requested output structure
      const audioUrls: string[] = [];
      if (d.music) audioUrls.push(sanitizeLink(d.music));
      if (d.music_info?.play) audioUrls.push(sanitizeLink(d.music_info.play));

      const videoUrls: string[] = [];
      if (d.hdplay) videoUrls.push(sanitizeLink(d.hdplay));
      if (d.play) videoUrls.push(sanitizeLink(d.play));
      if (d.wmplay) videoUrls.push(sanitizeLink(d.wmplay));

      return res.json({
        status: true,
        title: d.title || "TikTok Video",
        author: d.author?.nickname || "TikTok Creator",
        username: d.author?.unique_id || "username",
        cover: sanitizeLink(d.cover),
        video: videoUrls,
        audio: audioUrls,
        images: d.images ? d.images.map(sanitizeLink) : []
      });

    } catch (error: any) {
      console.error("Compatibility API error:", error);
      return res.status(500).json({
        status: false,
        message: error.message || "Failed to process TikTok URL"
      });
    }
  });

  // 2. Download proxy endpoint - forces browser attachment download instead of inline tab playback
  app.get("/api/proxy", async (req, res) => {
    try {
      const { url, filename } = req.query;
      if (!url || typeof url !== "string") {
        return res.status(400).send("Media download URL is required");
      }

      console.log(`Proxying download for: ${url}`);
      const mediaResponse = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Referer": "https://www.tiktok.com/"
        }
      });

      if (!mediaResponse.ok) {
        return res.status(mediaResponse.status).send(`Failed to fetch media file: ${mediaResponse.statusText}`);
      }

      const contentType = mediaResponse.headers.get("content-type") || "application/octet-stream";
      const contentLength = mediaResponse.headers.get("content-length");

      res.setHeader("Content-Type", contentType);
      if (contentLength) {
        res.setHeader("Content-Length", contentLength);
      }

      // Determine correct filename extension
      let ext = "mp4";
      if (contentType.includes("audio") || contentType.includes("mpeg") || url.includes(".mp3")) {
        ext = "mp3";
      } else if (contentType.includes("image/jpeg") || url.includes(".jpg") || url.includes(".jpeg")) {
        ext = "jpg";
      } else if (contentType.includes("image/png") || url.includes(".png")) {
        ext = "png";
      }

      const baseName = filename && typeof filename === "string" 
        ? filename.replace(/[^a-zA-Z0-9_-]/g, "_")
        : `tiktok_media_${Date.now()}`;

      const finalFilename = baseName.endsWith(`.${ext}`) ? baseName : `${baseName}.${ext}`;

      res.setHeader("Content-Disposition", `attachment; filename="${finalFilename}"`);

      // Stream media response stream to Express response client
      if (mediaResponse.body) {
        const { Readable } = await import("stream");
        Readable.fromWeb(mediaResponse.body as any).pipe(res);
      } else {
        res.status(500).send("Source stream is not bufferable");
      }
    } catch (err: any) {
      console.error("Proxy streaming error:", err);
      res.status(500).send(`Error downloading file: ${err.message}`);
    }
  });

  // 3. Vite development server middleware setup
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting in development mode with Vite HMR middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    console.log("Starting in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`TikTok Downloader Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
