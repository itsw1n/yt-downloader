import { useState } from "react";
import { Download, Music, Loader2 } from "lucide-react";
import styles from "./QualityGrid.module.css";

interface QualityGridProps {
  qualities: { height: number; ext: string; label: string }[];
  hasAudio: boolean;
  url: string;
}

export function QualityGrid({ qualities, hasAudio, url }: QualityGridProps) {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [dlError, setDlError] = useState<string | null>(null);

  async function download(quality: number | "audio" | "best") {
    if (!url || downloading) return;
    const key = String(quality);
    setDlError(null);
    setProgress(0);
    setDownloading(key);

    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const params = new URLSearchParams({ url });
    if (quality === "audio") params.set("audio", "1");
    else if (quality !== "best") params.set("quality", String(quality));
    const target = `/api/download?${params.toString()}`;

    try {
      // iOS Safari ignores blob `download`; rely on the server's
      // Content-Disposition: attachment (navigate directly, no progress).
      if (isIOS) {
        window.location.href = target;
        setTimeout(() => setDownloading(null), 4000);
        return;
      }

      const res = await fetch(target);
      if (!res.ok || !res.body) {
        let msg = `Download failed (${res.status})`;
        try {
          const j = await res.json();
          if (j?.error) msg = j.error;
        } catch {
          /* keep default */
        }
        throw new Error(msg);
      }

      const total = Number(res.headers.get("Content-Length") || 0);
      const disposition = res.headers.get("Content-Disposition") || "";
      const nameMatch = disposition.match(/filename="?([^";]+)"?/);
      const filename = nameMatch ? nameMatch[1] : "video.mp4";

      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.length;
          setProgress(total ? Math.min(99, Math.round((received / total) * 100)) : 0);
        }
      }

      let length = 0;
      for (const c of chunks) length += c.length;
      const merged = new Uint8Array(length);
      let offset = 0;
      for (const c of chunks) {
        merged.set(c, offset);
        offset += c.length;
      }
      const blob = new Blob([merged]);
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      setProgress(100);
    } catch (e) {
      setDlError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setDownloading(null);
    }
  }

  const isBusy = downloading !== null;
  const btn = (key: string, label: string, sub?: string, icon?: "dl" | "music") => (
    <button
      key={key}
      onClick={() => download(key === "best" ? "best" : key === "audio" ? "audio" : Number(key))}
      className={
        key === "best"
          ? styles.best
          : key === "audio"
            ? styles.audioBtn
            : styles.qBtn
      }
      disabled={isBusy}
    >
      {downloading === key ? (
        <Loader2 className={styles.spinner} />
      ) : icon === "music" ? (
        <Music className={styles.icon} />
      ) : (
        <Download className={key === "best" || key === "audio" ? styles.icon : styles.qIcon} />
      )}
      {downloading === key ? (
        <span>{progress > 0 ? `${progress}%` : "Preparing…"}</span>
      ) : (
        <>
          <span className={styles.qLabel}>{label}</span>
          {sub && <span className={styles.qSub}>{sub}</span>}
        </>
      )}
    </button>
  );

  return (
    <div className={styles.grid}>
      {qualities.length === 0 ? (
        btn("best", "Download Video")
      ) : (
        <>
          {btn(String(qualities[0].height), `Best Quality (${qualities[0].height}p)`)}
          {qualities.slice(1).map((q) => btn(String(q.height), `${q.height}p`, q.ext))}
        </>
      )}
      {hasAudio && btn("audio", "Download MP3 (Audio Only)")}

      {isBusy && (
        <div className={styles.progressWrap}>
          <div className={styles.progressBar} style={{ width: `${progress}%` }} />
        </div>
      )}
      {dlError && <p className={styles.error}>{dlError}</p>}
    </div>
  );
}
