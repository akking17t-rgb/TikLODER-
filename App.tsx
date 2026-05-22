import { useState, useEffect } from "react";
import { 
  Link as LinkIcon, 
  Download, 
  Sparkles, 
  Clipboard, 
  X, 
  Music, 
  HelpCircle, 
  CheckCircle2, 
  AlertCircle, 
  Play, 
  Share2, 
  MessageSquare, 
  Flame, 
  Eye, 
  Image as ImageIcon, 
  ArrowRight, 
  History, 
  Trash2,
  DownloadCloud,
  ExternalLink,
  ChevronDown,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { TikTokVideoData, TikWMResponse } from "./types";

interface RecentDownloadItem {
  id: string;
  title: string;
  cover: string;
  authorNickname: string;
  authorUniqueId: string;
  authorAvatar: string;
  timestamp: number;
  originalUrl: string;
}

export default function App() {
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoData, setVideoData] = useState<TikTokVideoData | null>(null);
  const [progressStage, setProgressStage] = useState("");
  const [downloadingType, setDownloadingType] = useState<string | null>(null);
  const [recentDownloads, setRecentDownloads] = useState<RecentDownloadItem[]>([]);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Load recent downloads from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("tt_downloader_history");
      if (stored) {
        setRecentDownloads(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load search history", e);
    }
  }, []);

  // Save recent downloads
  const saveToHistory = (data: TikTokVideoData, originalUrl: string) => {
    try {
      const newItem: RecentDownloadItem = {
        id: data.id,
        title: data.title || "No title/description",
        cover: data.cover,
        authorNickname: data.author.nickname,
        authorUniqueId: data.author.unique_id,
        authorAvatar: data.author.avatar,
        timestamp: Date.now(),
        originalUrl
      };

      setRecentDownloads(prev => {
        // Prevent duplicate IDs in history, keep the latest 6 runs
        const filtered = prev.filter(item => item.id !== data.id);
        const updated = [newItem, ...filtered].slice(0, 6);
        localStorage.setItem("tt_downloader_history", JSON.stringify(updated));
        return updated;
      });
    } catch (e) {
      console.error("Failed to save downloader history", e);
    }
  };

  const clearHistory = () => {
    try {
      localStorage.removeItem("tt_downloader_history");
      setRecentDownloads([]);
    } catch (e) {
      console.error(e);
    }
  };

  // Paste from clipboard helper
  const handlePaste = async () => {
    try {
      setError(null);
      const text = await navigator.clipboard.readText();
      if (text) {
        setTiktokUrl(text.trim());
      }
    } catch (err) {
      setError("Clipboard access permission denied. Please paste your link manually into the search box.");
    }
  };

  // Helper to format large numbers nicely
  const formatCount = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  };

  // Submit and fetch TikTok metadata
  const handleFetchInfo = async (urlToFetch?: string) => {
    const url = urlToFetch || tiktokUrl;
    if (!url) {
      setError("Please paste a valid TikTok link to begin.");
      return;
    }

    // Basic URL check
    if (!url.includes("tiktok.com") && !url.includes("douyin.com")) {
      setError("Are you sure this is a TikTok link? Make sure it's a valid tiktok.com or douyin.com URL.");
      // We will still allow the request to let server attempt resolution, but warn first.
    }

    setLoading(true);
    setError(null);
    setVideoData(null);
    setProgressStage("Connecting to TikWM server...");

    try {
      // Step-by-step progress simulation to keep the UI active
      const stageTimer = setTimeout(() => setProgressStage("Bypassing bot-detection systems..."), 800);
      const stageTimer2 = setTimeout(() => setProgressStage("Analyzing payload structure and media sources..."), 1600);
      const stageTimer3 = setTimeout(() => setProgressStage("Finalizing downloadable links..."), 2400);

      const response = await fetch(`/api/fetch?url=${encodeURIComponent(url.trim())}`);
      
      clearTimeout(stageTimer);
      clearTimeout(stageTimer2);
      clearTimeout(stageTimer3);

      if (!response.ok) {
        throw new Error(`Error: Server responded with status ${response.status}`);
      }

      const resJson: TikWMResponse = await response.json();

      if (resJson.code !== 0 || !resJson.data) {
        throw new Error(resJson.msg || "The provided link could not be loaded. Please ensure the post is public and not deleted.");
      }

      setVideoData(resJson.data);
      saveToHistory(resJson.data, url.trim());
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to parse video. Please verify the URL and try again.");
    } finally {
      setLoading(false);
    }
  };

  // Clean URL fields when clicking X
  const handleClearUrl = () => {
    setTiktokUrl("");
    setError(null);
  };

  // Media download helper through Express proxy
  const triggerDownload = async (mediaUrl: string, mediaType: string, customName?: string) => {
    try {
      setDownloadingType(mediaType);
      
      const fileName = customName ? `${customName}_${mediaType}` : `tiktok_media_${Date.now()}`;
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(mediaUrl)}&filename=${encodeURIComponent(fileName)}`;

      // Direct window location trigger to start attachment streaming. By routing
      // through the backend proxy, the browser receives appropriate Content-Disposition.
      window.location.href = proxyUrl;
      
      // Keep downloading spinner active for 2.5 seconds to signify connection start
      setTimeout(() => {
        setDownloadingType(null);
      }, 2500);
    } catch (err) {
      console.error("Trigger download failed", err);
      setError("Failed to initialize download stream. Please try again.");
      setDownloadingType(null);
    }
  };

  // Helper to trigger sequential downloads for slideshows
  const downloadAllImages = async (images: string[], originalId: string) => {
    try {
      setDownloadingType("all_images");
      for (let i = 0; i < images.length; i++) {
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(images[i])}&filename=${encodeURIComponent(`${originalId}_image_${i + 1}`)}`;
        // Create an invisible anchor tag to trigger sequential browser downloads
        const link = document.createElement("a");
        link.href = proxyUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        // Small stagger pause between multiple downloads to avoid browser block limits
        await new Promise(resolve => setTimeout(resolve, 600));
      }
    } catch (err) {
      console.error("Sequential image downloader fail", err);
    } finally {
      setDownloadingType(null);
    }
  };

  // FAQs configuration
  const faqs = [
    {
      q: "How do I download TikTok videos without watermark?",
      a: "Downloading videos without watermark is simple with TikLoder. Copy the video link from TikTok, paste it into our search bar at the top, and click 'Download'. TikLoder quickly processes the media, letting you save the high-speed HD MP4 file without logos or watermarks instantly."
    },
    {
      q: "Is TikLoder free?",
      a: "Yes, TikLoder is a completely free online utility. There is no registration, account creation, or payment required. You can download unlimited TikTok videos, MP3 audios, or photos slideshows with zero restrictions."
    },
    {
      q: "Can I download TikTok MP3 audio?",
      a: "Absolutely! TikLoder extracts high-fidelity audio tracks from TikTok videos. Simply paste the link, and you can download the background music track as an MP3 audio file with just one click."
    },
    {
      q: "Does TikLoder work on mobile devices?",
      a: "Yes! TikLoder is fully optimized for all mobile platforms, including Apple iOS (Safari) and Google Android (Chrome). Since we process the download through our high-speed server-side proxy streams, iOS and Android users can easily save the files directly to their local photos or downloads folder."
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans relative overflow-x-hidden select-none">
      
      {/* Decorative Blur Spheres */}
      <div className="absolute top-[-300px] left-[-200px] w-[600px] h-[600px] rounded-full bg-cyan-500/10 blur-[130px] pointer-events-none"></div>
      <div className="absolute top-[20%] right-[-300px] w-[700px] h-[700px] rounded-full bg-pink-500/15 blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-[-100px] left-[-200px] w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none"></div>

      {/* Header Bar */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur z-50 sticky top-0">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Custom crafted double overlap crescent TikTok style logo icon */}
            <div className="relative w-9 h-9 flex items-center justify-center bg-black rounded-lg overflow-hidden border border-zinc-800">
              <span className="font-display font-extrabold text-white text-lg tracking-tighter relative select-none z-10">T</span>
              <div className="absolute -inset-1.5 bg-gradient-to-tr from-cyan-400 via-zinc-800 to-pink-500 rounded-full animate-pulse opacity-80"></div>
            </div>
            <div>
              <div className="font-display font-bold text-lg md:text-xl text-neutral-50 tracking-tight flex items-center gap-1.5">
                Tik<span className="text-zinc-50 font-black">Loder</span>
              </div>
              <p className="hidden md:block text-[10px] text-zinc-400 uppercase tracking-widest font-semibold">Premium File Downloader Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-block px-3 py-1 text-xs font-semibold rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300">
              ⚡ Status: Online
            </span>
            <a 
              href="#faq"
              className="text-xs font-medium text-zinc-400 hover:text-zinc-100 transition"
            >
              Support FAQs
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 md:py-16 z-10 flex flex-col items-center">
        
        {/* Title Block */}
        <div className="text-center mb-8 max-w-xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 transition mb-4 cursor-default">
            <Sparkles className="w-4.5 h-4.5 text-cyan-400 animate-spin" style={{ animationDuration: '3s' }} />
            <span className="text-xs font-medium text-zinc-200">Free, No Watermark, High Quality Downloads</span>
          </div>
          
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl md:text-5xl text-white tracking-tight leading-none mb-4">
            TikLoder - TikTok Downloader
          </h1>
          <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
            Download TikTok videos without watermark in HD quality using <strong>TikLoder</strong>. Free TikTok MP4 and MP3 downloader with instant downloads.
          </p>
        </div>

        {/* Input Form Wrapper */}
        <div className="w-full max-w-2xl bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 md:p-6 mb-10 glowing-primary-card backdrop-blur-md">
          <div className="flex flex-col gap-2 relative">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-1 mb-1 block">
              Insert your TikTok video link
            </label>
            
            <div className="flex flex-col sm:flex-row gap-2 relative">
              <div className="relative flex-1">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                  <LinkIcon className="w-5 h-5" />
                </div>
                
                <input
                  type="text"
                  id="tiktok_url_input"
                  placeholder="https://www.tiktok.com/@username/video/..."
                  value={tiktokUrl}
                  onChange={(e) => {
                    setTiktokUrl(e.target.value);
                    if (error) setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleFetchInfo();
                    }
                  }}
                  disabled={loading}
                  className="w-full bg-zinc-950/90 hover:bg-zinc-950 focus:bg-zinc-950 border border-zinc-800 focus:border-cyan-400/80 rounded-xl py-3.5 pl-12 pr-12 text-sm text-white placeholder-zinc-500 focus:outline-none transition-all focus:ring-1 focus:ring-cyan-400/30"
                />

                {tiktokUrl && (
                  <button
                    type="button"
                    onClick={handleClearUrl}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-150 transition p-1 rounded-full bg-zinc-900 hover:bg-zinc-850"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Paste helper & Submit Action */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handlePaste}
                  disabled={loading}
                  className="px-3.5 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                  title="Paste from clipboard"
                >
                  <Clipboard className="w-4 h-4" />
                  <span className="hidden sm:inline">Paste</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => handleFetchInfo()}
                  disabled={loading || !tiktokUrl}
                  className="flex-1 sm:flex-initial px-6 py-3 bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-500 text-black font-extrabold text-sm rounded-xl flex items-center justify-center gap-1.5 transition-all duration-300 hover:brightness-110 active:scale-95 shadow-[0_0_20px_rgba(34,211,238,0.3)] disabled:opacity-50 disabled:pointer-events-none"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin stroke-[3]" />
                  ) : (
                    <Download className="w-4 h-4 stroke-[3]" />
                  )}
                  <span>{loading ? "Analyzing" : "Download"}</span>
                </button>
              </div>
            </div>
            
            {/* Quick Helper Text */}
            <p className="text-[11px] text-zinc-500 ml-1 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-zinc-600" />
              Supports links from TikTok mobile app, web desktop, Douyin, and short urls.
            </p>
          </div>

          {/* Loader Overlay */}
          <AnimatePresence>
            {loading && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 border-t border-zinc-800/80 pt-4 flex flex-col items-center justify-center text-center py-4"
              >
                <div className="relative w-12 h-12 flex items-center justify-center mb-3">
                  <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin"></div>
                  <Sparkles className="w-5 h-5 text-pink-500 animate-pulse" />
                </div>
                <h4 className="font-medium text-zinc-200 text-sm">{progressStage}</h4>
                <p className="text-xs text-zinc-500 mt-1">Downloading servers are resolving the content safely.</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error Alert Box */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mt-4 p-4 rounded-xl bg-red-950/55 border border-red-900/60 text-red-100/90 text-xs flex gap-3 items-start"
              >
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold mb-1">Downloader Alert</p>
                  <p className="leading-relaxed text-zinc-300">{error}</p>
                </div>
                <button 
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-200 transition shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Dynamic Parsing Output Card */}
        <AnimatePresence>
          {videoData && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ type: "spring", damping: 25 }}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl p-4 md:p-6 mb-10 text-left"
            >
              {/* Card Title */}
              <div className="flex justify-between items-center border-b border-zinc-800 pb-4 mb-6">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <p className="text-xs uppercase font-extrabold tracking-widest text-[#00f2fe]">Video Resolved Successfully</p>
                </div>
                <button
                  onClick={() => setVideoData(null)}
                  className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800/80 px-2.5 py-1 rounded-lg border border-zinc-700/60 transition"
                >
                  <X className="w-3.5 h-3.5" /> Reset
                </button>
              </div>

              {/* Main Media Grid content */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Visual Media Showcase Section */}
                <div className="lg:col-span-5 flex flex-col gap-3">
                  <div className="relative aspect-[9/16] max-h-[460px] lg:max-h-none w-full bg-black rounded-2xl overflow-hidden border border-zinc-850 group-hover:border-zinc-700 transition">
                    
                    {/* HTML5 Video preview option */}
                    {videoData.play ? (
                      <video
                        id="resolved_video_player"
                        src={videoData.play}
                        poster={videoData.cover}
                        controls
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={videoData.cover}
                        alt="TikTok Thumbnail cover"
                        className="w-full h-full object-cover"
                      />
                    )}

                    {!videoData.play && (
                      <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent flex items-end p-4">
                        <span className="text-xs bg-zinc-900/90 text-white border border-zinc-800 px-3 py-1.5 rounded-full font-medium">
                          Photo slideshow available below
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Play preview instructions */}
                  <div className="text-center">
                    <p className="text-[10px] text-zinc-500 italic">
                      💡 Click play to preview or listen before downloading
                    </p>
                  </div>
                </div>

                {/* Media details, descriptions, stats & buttons links */}
                <div className="lg:col-span-7 flex flex-col justify-between">
                  <div className="space-y-4">
                    
                    {/* Creator Nickname / Profile */}
                    <div className="flex gap-3 items-center p-3 rounded-2xl bg-zinc-950 border border-zinc-850">
                      <img
                        src={videoData.author?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80"}
                        alt={videoData.author?.nickname || "Creator Avatar"}
                        className="w-11 h-11 rounded-full border border-zinc-800 object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-white truncate leading-snug">
                          {videoData.author?.nickname || "TikTok Creator"}
                        </h4>
                        <p className="text-xs text-zinc-500 truncate font-mono">
                          @{videoData.author?.unique_id || "username"}
                        </p>
                      </div>
                      <a
                        href={`https://www.tiktok.com/@${videoData.author?.unique_id}`}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-[10px] flex items-center gap-1 text-zinc-400 hover:text-[#00f2fe] bg-zinc-900 px-2.5 py-1.5 rounded-lg border border-zinc-800 transition"
                      >
                        Visit profile <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    {/* TikTok Title caption description */}
                    <div className="p-1">
                      <p className="text-zinc-200 text-sm leading-relaxed font-normal line-clamp-3">
                        {videoData.title || "No description provided."}
                      </p>
                    </div>

                    {/* Likes & Views Metric Stats Row */}
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="bg-zinc-950 border border-zinc-850 p-2.5 rounded-xl">
                        <Flame className="w-4 h-4 mx-auto text-pink-500 mb-1" />
                        <span className="block text-xs font-bold text-white leading-none">
                          {formatCount(videoData.digg_count || 0)}
                        </span>
                        <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-semibold mt-1 block">Likes</span>
                      </div>
                      
                      <div className="bg-zinc-950 border border-zinc-850 p-2.5 rounded-xl">
                        <Eye className="w-4 h-4 mx-auto text-cyan-400 mb-1" />
                        <span className="block text-xs font-bold text-white leading-none">
                          {formatCount(videoData.play_count || 0)}
                        </span>
                        <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-semibold mt-1 block">Views</span>
                      </div>

                      <div className="bg-zinc-950 border border-zinc-850 p-2.5 rounded-xl">
                        <MessageSquare className="w-4 h-4 mx-auto text-zinc-400 mb-1" />
                        <span className="block text-xs font-bold text-white leading-none">
                          {formatCount(videoData.comment_count || 0)}
                        </span>
                        <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-semibold mt-1 block">Comments</span>
                      </div>

                      <div className="bg-zinc-950 border border-zinc-850 p-2.5 rounded-xl">
                        <Share2 className="w-4 h-4 mx-auto text-yellow-500 mb-1" />
                        <span className="block text-xs font-bold text-white leading-none">
                          {formatCount(videoData.share_count || 0)}
                        </span>
                        <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-semibold mt-1 block">Shares</span>
                      </div>
                    </div>

                    {/* Sound details info banner if accessible */}
                    {videoData.music_info && (
                      <div className="flex items-center gap-3 p-2 px-3 rounded-xl bg-zinc-950 border border-zinc-850/60">
                        <Music className="w-4 h-4 text-[#00f2fe] animate-pulse shrink-0" />
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-xs font-semibold text-zinc-300 truncate">
                            {videoData.music_info.title}
                          </p>
                          <p className="text-[10px] text-zinc-500 truncate">
                            By {videoData.music_info.author}
                          </p>
                        </div>
                      </div>
                    )}

                  </div>

                  {/* ACTION DOWNLOAD BUTTONS */}
                  <div className="mt-6 space-y-2.5">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Download Links</p>
                    
                    {/* Primary options: No Watermark Standard */}
                    {videoData.play && (
                      <button
                        type="button"
                        onClick={() => triggerDownload(videoData.play, "no_watermark", `${videoData.author.unique_id}_${videoData.id}`)}
                        disabled={!!downloadingType}
                        className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-teal-500 text-black font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer transition active:scale-98 disabled:opacity-50 hover:brightness-110 shadow-md"
                      >
                        {downloadingType === "no_watermark" ? (
                          <Loader2 className="w-4.5 h-4.5 animate-spin stroke-[2.5]" />
                        ) : (
                          <Download className="w-4.5 h-4.5 stroke-[2.5]" />
                        )}
                        <span>
                          {downloadingType === "no_watermark" ? "Preparing File stream..." : "Download Video (No Watermark)"}
                        </span>
                      </button>
                    )}

                    {/* Secondary HD No Watermark option */}
                    {videoData.hdplay && (
                      <button
                        type="button"
                        onClick={() => triggerDownload(videoData.hdplay!, "hd_no_watermark", `${videoData.author.unique_id}_${videoData.id}_hd`)}
                        disabled={!!downloadingType}
                        className="w-full py-3 bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer transition active:scale-98 disabled:opacity-50"
                      >
                        {downloadingType === "hd_no_watermark" ? (
                          <Loader2 className="w-4.5 h-4.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-4.5 h-4.5 text-pink-500" />
                        )}
                        <span>
                          {downloadingType === "hd_no_watermark" ? "Streaming HD data..." : "Download HD Video (Full Quality)"}
                        </span>
                      </button>
                    )}

                    {/* Audio track only download option */}
                    {videoData.music && (
                      <button
                        type="button"
                        onClick={() => triggerDownload(videoData.music, "music_mp3", `${videoData.author.unique_id}_${videoData.id}_sound`)}
                        disabled={!!downloadingType}
                        className="w-full py-3 bg-zinc-805 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-200 font-semibold text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer transition active:scale-98 disabled:opacity-50"
                      >
                        {downloadingType === "music_mp3" ? (
                          <Loader2 className="w-4.5 h-4.5 animate-spin" />
                        ) : (
                          <Music className="w-4.5 h-4.5" />
                        )}
                        <span>
                          {downloadingType === "music_mp3" ? "Extracting sound..." : "Download Sound (MP3 Link)"}
                        </span>
                      </button>
                    )}

                    {/* Watermarked option (optional toggle) */}
                    {videoData.wmplay && (
                      <button
                        type="button"
                        onClick={() => triggerDownload(videoData.wmplay, "watermarked", `${videoData.author.unique_id}_${videoData.id}_watermark`)}
                        disabled={!!downloadingType}
                        className="w-full py-2.5 bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-400 hover:text-zinc-200 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer hover:bg-zinc-850 transition"
                      >
                        {downloadingType === "watermarked" ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        <span>Download with TikTok Watermark / End Cards</span>
                      </button>
                    )}

                  </div>
                </div>

              </div>

              {/* SLIDESHOW GALLERY IF PRESENT */}
              {videoData.images && videoData.images.length > 0 && (
                <div className="mt-8 border-t border-zinc-800/80 pt-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                    <div>
                      <h5 className="font-display font-semibold text-white tracking-tight flex items-center gap-2">
                        <ImageIcon className="w-4.5 h-4.5 text-[#00f2fe]" /> 
                        Photo Album Decoded ({videoData.images.length} photos)
                      </h5>
                      <p className="text-zinc-500 text-xs mt-0.5">This Tiktok post is a high-resolution slider album. Choose individual or batch files below.</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => downloadAllImages(videoData.images!, videoData.id)}
                      disabled={!!downloadingType}
                      className="text-xs font-bold px-4 py-2 text-zinc-950 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-lg hover:brightness-105 active:scale-95 transition shrink-0 flex items-center gap-1.5"
                    >
                      {downloadingType === "all_images" ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <DownloadCloud className="w-3.5 h-3.5" />
                      )}
                      <span>Download All Images</span>
                    </button>
                  </div>

                  {/* Horizontal Scroll Grid of Slideshow images */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[300px] overflow-y-auto pr-1 p-0.5 rounded-lg border border-zinc-850 bg-zinc-950/40">
                    {videoData.images.map((imgUrl, idx) => (
                      <div key={idx} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden p-2 flex flex-col justify-between gap-2">
                        <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden group">
                          <img
                            src={imgUrl}
                            alt={`Slide ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute bottom-1.5 left-1.5 bg-black/70 border border-zinc-800 text-[9px] px-1.5 py-0.5 rounded-md font-mono text-white">
                            Photo {idx + 1}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => triggerDownload(imgUrl, `image_${idx + 1}`, `${videoData.id}`)}
                          disabled={!!downloadingType}
                          className="w-full py-1 text-[10px] uppercase font-bold text-zinc-400 hover:text-[#00f2fe] bg-zinc-950 hover:bg-black border border-zinc-800 rounded-md transition"
                        >
                          Save Photo {idx + 1}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </motion.div>
          )}
        </AnimatePresence>

        {/* Recent Downloads History Panel */}
        {recentDownloads.length > 0 && (
          <div className="w-full text-left mb-12">
            <div className="flex items-center justify-between border-b border-zinc-850 pb-2 mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <History className="w-4 h-4 text-zinc-500" /> Recent downloads list
              </h3>
              <button
                onClick={clearHistory}
                className="text-[10px] text-zinc-500 hover:text-red-400 flex items-center gap-1 transition"
                title="Wipe down history"
              >
                <Trash2 className="w-3 h-3" /> Clear History
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recentDownloads.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleFetchInfo(item.originalUrl)}
                  className="bg-zinc-950/50 hover:bg-zinc-900/60 border border-zinc-900 hover:border-zinc-800 p-2.5 rounded-xl flex items-center gap-3 cursor-pointer transition relative group"
                >
                  <img
                    src={item.cover}
                    alt={item.title}
                    className="w-9 h-12 object-cover rounded-md shrink-0 border border-zinc-850"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-300 font-medium truncate group-hover:text-white transition">
                      {item.title}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <img
                        src={item.authorAvatar}
                        alt="Avatar"
                        className="w-3.5 h-3.5 rounded-full border border-zinc-800 object-cover"
                      />
                      <span className="text-[10px] text-zinc-500 font-mono truncate">
                        @{item.authorUniqueId}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-200 transition transform group-hover:translate-x-0.5 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3 Step Instruction Guide Section */}
        <div className="w-full text-left bg-zinc-900/20 border border-zinc-900 rounded-2xl p-6 mb-12">
          <h3 className="font-display font-bold text-lg text-white mb-6 text-center">
            How to Download TikTok Videos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-400 font-display font-black text-sm flex items-center justify-center mb-3">
                1
              </div>
              <h5 className="font-bold text-xs text-zinc-200 mb-1">Copy Link</h5>
              <p className="text-zinc-500 text-[11px] max-w-[200px]">
                Open the TikTok application or website, select your video, and click <b>Copy Link</b> options.
              </p>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-pink-950 border border-pink-800 text-pink-400 font-display font-black text-sm flex items-center justify-center mb-3">
                2
              </div>
              <h5 className="font-bold text-xs text-zinc-200 mb-1">Paste Link</h5>
              <p className="text-zinc-500 text-[11px] max-w-[200px]">
                Paste the video link inside the URL container up above and press <b>Download</b> index finder.
              </p>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-neutral-950 border border-neutral-700 text-neutral-300 font-display font-black text-sm flex items-center justify-center mb-3">
                3
              </div>
              <h5 className="font-bold text-xs text-zinc-200 mb-1">Save Offline</h5>
              <p className="text-zinc-500 text-[11px] max-w-[200px]">
                Click the No Watermark options or standard MP3 track links to save files instantly to your local memory.
              </p>
            </div>

          </div>
        </div>

        {/* HOMEPAGE SEO OPTIMIZATION CONTENT BLOCK */}
        <section className="w-full text-left bg-zinc-900/10 border border-zinc-900 rounded-3xl p-6 md:p-8 mb-12">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-display font-bold text-2xl md:text-3xl text-neutral-50 mb-6 text-center tracking-tight">
              Premium TikTok Downloading with <span className="text-[#00f2fe] font-extrabold">TikLoder</span>
            </h2>
            <p className="text-zinc-400 text-xs md:text-sm leading-relaxed mb-8 text-center max-w-2xl mx-auto">
              Welcome to the internet's most efficient TikTok media downloader. TikLoder has engineered a lightweight, super-fast file parsing system designed specifically for creators, editors, and casual fans seeking peak resolution media with absolutely no branding tags.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="bg-zinc-950/40 p-5 rounded-2xl border border-zinc-900 hover:border-zinc-800 transition">
                <h3 className="font-display font-semibold text-sm md:text-base text-cyan-400 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                  How to download TikTok videos
                </h3>
                <p className="text-zinc-500 text-xs leading-relaxed">
                  To begin downloading with TikLoder, simply capture a link directly from your iOS/Android TikTok app share button or via web browser. Once copied, drop your URL link into our interactive processing area above. Our background script filters incoming payloads, executes automatic validation, and creates immediate, high-fidelity secure direct-streaming local loops in seconds.
                </p>
              </div>

              <div className="bg-zinc-950/40 p-5 rounded-2xl border border-zinc-900 hover:border-zinc-800 transition">
                <h3 className="font-display font-semibold text-sm md:text-base text-pink-400 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-400"></span>
                  Download TikTok without watermark
                </h3>
                <p className="text-zinc-500 text-xs leading-relaxed">
                  Tired of obtrusive overlay logos obscuring core content detail? TikLoder queries official CDN systems and serves clean, unwatermarked raw data streams. Our downloader isolates the genuine high-definition video files directly from TikTok's backend to let you recycle video assets cleanly for presentation, local backup, desktop slideshows, or design archives.
                </p>
              </div>

              <div className="bg-zinc-950/40 p-5 rounded-2xl border border-zinc-900 hover:border-zinc-800 transition">
                <h3 className="font-display font-semibold text-sm md:text-base text-teal-400 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                  TikTok MP4 downloader
                </h3>
                <p className="text-zinc-500 text-xs leading-relaxed">
                  Our core processing engine converts references seamlessly into premium web-ready MP4 formats compatible with all modern portable electronics. By enforcing optimized Node.js attachment proxy headers, TikLoder redirects media queries into a forced attachment stream, prompting your browser UI to immediately proceed with a local download instead of launching default inline video popups.
                </p>
              </div>

              <div className="bg-zinc-950/40 p-5 rounded-2xl border border-zinc-900 hover:border-zinc-800 transition">
                <h3 className="font-display font-semibold text-sm md:text-base text-yellow-500 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                  TikTok MP3 downloader
                </h3>
                <p className="text-zinc-500 text-xs leading-relaxed">
                  Extract pure sound tracks and background loops directly from TikTok posts. When you key in an active link, our parser searches soundtrack manifests to isolate the raw high-bitrate audio assets. Download pure high-quality MP3 audio with one tap, perfect for sound design inspiration, offline listening, and customized audio mashups.
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* FAQs Accordion Block */}
        <div id="faq" className="w-full text-left scroll-mt-20">
          <h3 className="font-display font-bold text-xl text-neutral-50 mb-4 text-center">
            Frequently Asked Questions
          </h3>
          <p className="text-zinc-500 text-xs text-center mb-8">Quick answers regarding capabilities, security, and formats of the TikTok Downloader.</p>
          
          <div className="space-y-3 mb-12">
            {faqs.map((faq, idx) => (
              <div 
                key={idx} 
                className="bg-zinc-900/40 border border-zinc-900 rounded-xl overflow-hidden hover:border-zinc-800 transition"
              >
                <button
                  type="button"
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full p-4 flex items-center justify-between text-left cursor-pointer text-zinc-100 hover:text-white transition"
                >
                  <span className="text-xs md:text-sm font-semibold">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform duration-300 ${activeFaq === idx ? 'transform rotate-180 text-[#00f2fe]' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {activeFaq === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="px-4 pb-4 text-xs text-zinc-400 border-t border-zinc-900/60 pt-3 leading-relaxed">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

        {/* Developer API Documentation Panel */}
        <div className="w-full text-left bg-zinc-950 border border-zinc-900 rounded-2xl p-6 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/25">Developer API</span>
            <h4 className="font-display font-bold text-base text-white">Full-Stack TikTok API Service</h4>
          </div>
          <p className="text-zinc-400 text-xs mb-4">
            This workspace includes an active server-side HTTP endpoint perfect for automated fetches and custom browser extensions. Supports direct watermarked, audio MP3, and slideshow image outputs.
          </p>

          <div className="space-y-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Request Endpoint</span>
              <div className="bg-zinc-900 border border-zinc-850 p-2.5 rounded-xl font-mono text-[10px] text-zinc-300 flex items-center justify-between">
                <span className="truncate">GET <span className="text-emerald-400">/tiktok/api.php</span>?url=<span className="text-cyan-300">{"{TIKTOK_VIDEO_URL}"}</span></span>
                <span className="text-[9px] bg-zinc-850 px-2 py-1 rounded text-zinc-400 font-bold shrink-0">FREE / PUBLIC</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Testing via cURL</span>
              <div className="bg-zinc-900 border border-zinc-850 p-3 rounded-xl font-mono text-[10px] text-zinc-400 overflow-x-auto relative">
                <p className="text-zinc-300 font-light select-all">curl -X GET &quot;{window.location.origin}/tiktok/api.php?url=https://www.tiktok.com/@lazy_code/video/7321098&quot;</p>
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Example JSON response</span>
              <div className="bg-zinc-900 border border-zinc-850 p-4 rounded-xl font-mono text-[9px] text-zinc-400 overflow-x-auto max-h-[220px] scrollbar-thin">
                <pre className="text-emerald-500/90 leading-tight select-all">
{`{
  "status": true,
  "title": "Clean design inspiration #aesthetic 🎨",
  "author": "Creative Lab",
  "username": "creativelab_official",
  "cover": "https://www.tikwm.com/video/cover/...",
  "video": [
    "https://www.tikwm.com/video/media/play/...", // No Watermark HD
    "https://www.tikwm.com/video/media/wmplay/..." // With original logo
  ],
  "audio": [
    "https://www.tikwm.com/video/music/..." // MP3 backtrack URL
  ],
  "images": [] // Empty if video, populated if photo slide layout
}`}
                </pre>
              </div>
            </div>
          </div>
        </div>

      </main>

      {/* Footer Info Statement */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-8 mt-16 text-center text-xs text-zinc-650 shrink-0">
        <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-zinc-500 font-mono text-[10px]">
            &copy; 2026 TikLoder. Premium No-Watermark TikTok Video &amp; MP3 Downloader.
          </p>
          <div className="flex gap-4">
            <span className="text-zinc-500 hover:text-zinc-400 text-[10px] cursor-default">Free No-Watermark Utility</span>
            <span className="text-zinc-6 w-1 h-1 rounded-full bg-zinc-800 self-center"></span>
            <span className="text-zinc-500 hover:text-zinc-400 text-[10px] cursor-default">Fast Cdn Delivery</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
