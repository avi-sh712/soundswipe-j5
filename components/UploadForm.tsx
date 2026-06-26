"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  UploadCloud,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  Music,
} from "lucide-react";
import { UPLOAD_CATEGORIES } from "../lib/categories";
import { requestPresignedUrl, uploadToS3, confirmUpload } from "../lib/api";

const MAX_SECONDS = 10;

type Phase = "idle" | "validating" | "uploading" | "success" | "error";

export default function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [fileDuration, setFileDuration] = useState(0);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(UPLOAD_CATEGORIES[0].value);
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndSetFile = (selected: File | undefined) => {
    if (!selected) return;
    if (!selected.type.startsWith("audio/")) {
      setPhase("error");
      setMessage("Please choose an audio file.");
      return;
    }
    setPhase("validating");
    setMessage("Checking duration…");

    const audio = new Audio(URL.createObjectURL(selected));
    audio.onloadedmetadata = () => {
      if (audio.duration > MAX_SECONDS) {
        setPhase("error");
        setMessage(`Audio must be ${MAX_SECONDS} seconds or less.`);
        setFile(null);
      } else {
        setFileDuration(audio.duration);
        setFile(selected);
        setPhase("idle");
        setMessage("");
        if (!title) setTitle(selected.name.replace(/\.[^.]+$/, ""));
      }
    };
    audio.onerror = () => {
      setPhase("error");
      setMessage("Could not read that audio file.");
      setFile(null);
    };
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
      setFile(null);
      setFileDuration(0);
      if (inputRef.current) inputRef.current.value = "";
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
          Upload a sound
        </h1>
        <p className="mb-6 text-sm text-muted">
          Short clips only — {MAX_SECONDS} seconds or less.
        </p>

        {/* Drop zone */}
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
        <input
          ref={inputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => validateAndSetFile(e.target.files?.[0])}
        />

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
      </form>
    </div>
  );
}
