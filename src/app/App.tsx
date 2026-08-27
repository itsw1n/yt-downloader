import { useState } from "react";
import { Youtube } from "lucide-react";
import { UrlForm } from "@/features/downloader/components/UrlForm";
import { VideoResult } from "@/features/downloader/components/VideoResult";
import { HowToSteps } from "@/features/downloader/components/HowToSteps";
import { CapcutTip } from "@/features/downloader/components/CapcutTip";
import {
  StatusMessage,
  type Status,
} from "@/components/ui/StatusMessage/StatusMessage";
import { Card } from "@/components/ui/Card/Card";
import { useVideoInfo } from "@/features/downloader/hooks/useVideoInfo";
import type { VideoInfo } from "@/features/downloader/types";
import styles from "./App.module.css";

export function App() {
  const [input, setInput] = useState("");
  const [url, setUrl] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const { data, isLoading, isError, error } = useVideoInfo(url);

  const status: Status = isLoading
    ? "loading"
    : isError
      ? "error"
      : data
        ? "success"
        : "idle";

  function handleSubmit() {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (!trimmed.includes("youtube.com") && !trimmed.includes("youtu.be")) {
      setInvalid(true);
      setUrl(null);
      return;
    }
    setInvalid(false);
    setUrl(trimmed);
  }

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <Youtube className={styles.logoIcon} />
          <h1 className={styles.logoText}>YT Save</h1>
        </div>
        <p className={styles.subtitle}>
          Paste link → Choose quality → Save to Gallery
        </p>
      </header>

      <Card>
        <UrlForm
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          isLoading={isLoading}
        />
        {invalid && (
          <StatusMessage status="error">
            That doesn&apos;t look like a YouTube link
          </StatusMessage>
        )}
        {status === "loading" && (
          <StatusMessage status="loading">Fetching video info...</StatusMessage>
        )}
        {status === "error" && (
          <StatusMessage status="error">
            {error instanceof Error ? error.message : "Failed to fetch video"}
          </StatusMessage>
        )}
      </Card>

      {data && <VideoResult info={data as VideoInfo} url={url ?? ""} />}

      <div className={styles.section}>
        <HowToSteps />
      </div>
      <div className={styles.section}>
        <CapcutTip />
      </div>

      <footer className={styles.footer}>
        Self-hosted • No ads • No tracking • Uses yt-dlp
        <br />
        For personal use. Made by{" "}
        <a
          href="https://github.com/itsw1n"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.link}
        >
          itsw1n
        </a>
      </footer>
    </div>
  );
}
