"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  UploadCloud,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  Music,
  Mic,
  Square,
  Crown,
  Trash2,
} from "lucide-react";
import { UPLOAD_CATEGORIES } from "../lib/categories";
import { requestPresignedUrl, uploadToS3, confirmUpload } from "../lib/api";
import ProModal from "./ProModal";

const MAX_SECONDS = 30;

type Phase = "idle" | "validating" | "uploading" | "success" | "error";
type Mode = "upload" | "record";

export default function UploadForm() {
  const [mode, setMode] = useState<Mode>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileDuration, setFileDuration] = useState(0);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(UPLOAD_CATEGORIES[0].value);
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("");
  const [dragging, setDragging] = useState(false);
  const [showPro, setShowPro] = useState(false);

  // Recording state
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      stopTracks();
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const resetSelection = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFile(null);
    setFileDuration(0);
    setMessage("");
    setPhase("idle");
    if (inputRef.current) inputRef.current.value = "";
  };

  const acceptFile = (selected: File, duration: number) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFileDuration(duration);
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setPhase("idle");
    setMessage("");
    if (!title) setTitle(selected.name.replace(/\.[^.]+$/, ""));
  };

  const validateAndSetFile = (selected: File | undefined) => {
    if (!selected) return;
    if (!selected.type.startsWith("audio/")) {
      setPhase("error");
      setMessage("Please choose an audio file.");
      return;
    }
    setPhase("validating");
    setMessage("Checking duration…");

    const objectUrl = URL.createObjectURL(selected);
    const audio = new Audio(objectUrl);
    audio.onloadedmetadata = () => {
      const dur = audio.duration;
      // Some encodings (e.g. webm recordings) report Infinity/NaN duration.
      // Only gate behind premium when we have a real, finite over-limit value.
      if (Number.isFinite(dur) && dur > MAX_SECONDS) {
        setPhase("error");
        setMessage(
          `That clip is ${dur.toFixed(0)}s. Free uploads are capped at ${MAX_SECONDS}s.`,
        );
        setFile(null);
        setShowPro(true);
      } else {
        acceptFile(selected, Number.isFinite(dur) ? dur : 0);
      }
      URL.revokeObjectURL(objectUrl);
    };
    audio.onerror = () => {
      // Couldn't decode metadata — accept it anyway rather than block a valid
      // upload; the backend/S3 remain the source of truth.
      acceptFile(selected, 0);
      URL.revokeObjectURL(objectUrl);
    };
  };

  // ---- Live recording -------------------------------------------------------

  const startRecording = async () => {
    resetSelection();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        const ext = (recorder.mimeType || "audio/webm").includes("ogg")
          ? "ogg"
          : "webm";
        const recordedFile = new File([blob], `recording-${Date.now()}.${ext}`, {
          type: blob.type,
        });
        const audio = new Audio(URL.createObjectURL(blob));
        audio.onloadedmetadata = () => {
          const dur = isFinite(audio.duration) ? audio.duration : elapsed;
          acceptFile(recordedFile, dur);
        };
        // Fallback if metadata duration is unavailable
        audio.onerror = () => acceptFile(recordedFile, elapsed);
        stopTracks();
      };

      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 0.1;
          if (next >= MAX_SECONDS) {
            stopRecording();
            return MAX_SECONDS;
          }
          return next;
        });
      }, 100);
    } catch {
      setPhase("error");
      setMessage("Microphone access was denied.");
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    try {
      setPhase("uploading");
      setMessage("Requesting secure upload URL…");
      const { presigned_url, asset_id, object_key } = await requestPresignedUrl({
        file_name: file.name,
        content_type: file.type,
        category,
      });

      setMessage("Uploading to S3…");
      await uploadToS3(presigned_url, file);

      setMessage("Saving to the library…");
      await confirmUpload({
        asset_id,
        file_name: title || file.name,
        category,
        object_key,
      });

      setPhase("success");
      setMessage("Upload complete! Your sound is live.");
      setTitle("");
      resetSelection();
    } catch (err) {
      setPhase("error");
      setMessage(err instanceof Error ? err.message : "Upload failed.");
    }
  };

  const busy = phase === "uploading" || phase === "validating";

  return (
    <div className="w-full max-w-md">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted transition hover:text-foreground"
      >
        <ArrowLeft size={16} />
        Back to feed
      </Link>

      <form
        onSubmit={handleUpload}
        className="rounded-3xl bg-surface p-6 shadow-2xl ring-1 ring-border"
      >
        <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold">
          <UploadCloud className="text-accent" />
          Add a sound
        </h1>
        <p className="mb-5 text-sm text-muted">
          Upload or record a clip — up to {MAX_SECONDS} seconds.
        </p>

        {/* Mode toggle */}
        <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
          {(["upload", "record"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                if (recording) stopRecording();
                resetSelection();
                setMode(m);
              }}
              className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold capitalize transition ${
                mode === m
                  ? "bg-accent text-accent-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {m === "upload" ? <UploadCloud size={16} /> : <Mic size={16} />}
              {m}
            </button>
          ))}
        </div>

        {/* Upload mode */}
        {mode === "upload" && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              validateAndSetFile(e.dataTransfer.files?.[0]);
            }}
            className={`mb-5 flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition ${
              dragging
                ? "border-accent bg-accent/5"
                : file
                  ? "border-accent/50 bg-surface-2"
                  : "border-border bg-surface-2/50 hover:border-accent/50"
            }`}
          >
            {file ? (
              <>
                <Music className="text-accent" size={28} />
                <span className="max-w-full truncate text-sm font-semibold">
                  {file.name}
                </span>
                <span className="font-mono text-xs text-muted">
                  {fileDuration.toFixed(1)}s
                </span>
              </>
            ) : (
              <>
                <UploadCloud className="text-muted" size={28} />
                <span className="text-sm font-medium">
                  Drag &amp; drop or click to browse
                </span>
                <span className="text-xs text-muted">MP3, WAV, OGG</span>
              </>
            )}
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => validateAndSetFile(e.target.files?.[0])}
        />

        {/* Record mode */}
        {mode === "record" && (
          <div className="mb-5 flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-border bg-surface-2/50 px-4 py-8">
            <div className="font-mono text-3xl font-bold tabular-nums">
              {elapsed.toFixed(1)}
              <span className="text-base text-muted">/{MAX_SECONDS}s</span>
            </div>

            {recording ? (
              <button
                type="button"
                onClick={stopRecording}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-like text-white shadow-lg ring-4 ring-like/30 transition animate-pulse"
                aria-label="Stop recording"
              >
                <Square size={24} fill="currentColor" />
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg transition hover:opacity-90"
                aria-label="Start recording"
              >
                <Mic size={26} />
              </button>
            )}

            <span className="text-xs text-muted">
              {recording
                ? "Recording… tap to stop"
                : file
                  ? "Recorded — preview below"
                  : "Tap the mic to start"}
            </span>
          </div>
        )}

        {/* Preview player */}
        {previewUrl && !recording && (
          <div className="mb-5 flex items-center gap-3 rounded-xl bg-surface-2 p-3 ring-1 ring-border">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio src={previewUrl} controls className="h-9 w-full" />
            <button
              type="button"
              onClick={resetSelection}
              aria-label="Discard clip"
              className="shrink-0 text-muted transition hover:text-like"
            >
              <Trash2 size={18} />
            </button>
          </div>
        )}

        <div className="mb-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted">
              Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Soft UI tap"
              className="w-full rounded-xl border border-border bg-surface-2 p-3 text-foreground outline-none transition placeholder:text-muted/60 focus:border-accent"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-2 p-3 text-foreground outline-none transition focus:border-accent"
            >
              {UPLOAD_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={!file || busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 font-bold text-accent-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy && <Loader2 className="animate-spin" size={18} />}
          {phase === "uploading" ? "Uploading…" : "Publish to feed"}
        </button>

        {message && (
          <div
            className={`mt-4 flex items-center justify-center gap-2 text-center text-sm ${
              phase === "error"
                ? "text-like"
                : phase === "success"
                  ? "text-accent"
                  : "text-muted"
            }`}
          >
            {phase === "error" && <XCircle size={16} />}
            {phase === "success" && <CheckCircle2 size={16} />}
            <span>{message}</span>
          </div>
        )}

        {/* Premium teaser */}
        <button
          type="button"
          onClick={() => setShowPro(true)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface-2/50 py-2.5 text-xs font-semibold text-muted transition hover:border-accent/50 hover:text-foreground"
        >
          <Crown size={14} className="text-accent" />
          Need longer clips? Go Pro
        </button>
      </form>

      {showPro && <ProModal onClose={() => setShowPro(false)} />}
    </div>
  );
}
