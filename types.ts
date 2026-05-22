export interface TikTokAuthor {
  id: string;
  unique_id: string;
  nickname: string;
  avatar: string;
}

export interface TikTokMusicInfo {
  id: string;
  title: string;
  play: string;
  author: string;
  cover: string;
}

export interface TikTokVideoData {
  id: string;
  region: string;
  title: string;
  cover: string;
  origin_cover: string;
  duration: number;
  play: string;     // regular quality no watermark
  wmplay: string;   // with watermark
  hdplay?: string;  // high definition no watermark (optional)
  size?: number;
  wm_size?: number;
  hd_size?: number;
  music: string;    // Direct link to audio track
  music_info?: TikTokMusicInfo;
  author: TikTokAuthor;
  digg_count: number;
  play_count: number;
  comment_count: number;
  share_count: number;
  download_count: number;
  images?: string[]; // If it's a slide image layout
}

export interface TikWMResponse {
  code: number;
  msg: string;
  processed_time: number;
  data?: TikTokVideoData;
}
