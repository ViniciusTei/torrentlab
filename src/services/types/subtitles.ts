export type SubtitlesResponse = {
  total_pages: number
  total_count: number
  per_page: number
  page: number
  data: Subtitle[]
}

export interface Subtitle {
  id: string;
  type: string;
  attributes: {
    subtitle_id: string;
    language: string;
    download_count: number;
    new_download_count: number;
    hearing_impaired: boolean;
    hd: boolean;
    fps: number;
    votes: number;
    points: number;
    ratings: number;
    from_trusted: boolean;
    foreign_parts_only: boolean;
    ai_translated: boolean;
    machine_translated: boolean;
    upload_date: string;
    release: string;
    comments: string;
    legacy_subtitle_id: number;
    uploader: {
      uploader_id: number;
      name: string;
      rank: string;
    };
    feature_details: {
      feature_id: number;
      feature_type: string;
      year: number;
      title: string;
      movie_name: string;
      imdb_id: number;
      tmdb_id: number;
    };
    url: string;
    related_links: Array<{
      label: string
      url: string
      img_url: string
    }>;
    files: Array<{
      file_id: number
      cd_number: number
      file_name: string
    }>;
  };
}

export type SubtitleDownloadResponse = {
  link: string;
  file_name: string;
  requests: number;
  remaining: number;
  message: string;
  reset_time: string;
  reset_time_utc: string;
}
