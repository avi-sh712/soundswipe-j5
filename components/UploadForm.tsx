"use client";

import { useState } from "react";
import { UploadCloud } from "lucide-react";

export default function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("UI");
  const [status, setStatus] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const audio = new Audio(URL.createObjectURL(selectedFile));
    audio.onloadedmetadata = () => {
      if (audio.duration > 10) {
        setStatus("Error: Audio must be 10 seconds or less.");
        setFile(null);
      } else {
        setStatus("");
        setFile(selectedFile);
      }
    };
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setStatus("Requesting secure URL...");
    try {
      const urlRes = await fetch("/api/upload/presigned-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_name: file.name,
          content_type: file.type,
          category: category
        })
      });
      
      const { presigned_url, asset_id, object_key } = await urlRes.json();

      setStatus("Uploading to S3...");
      const formData = new FormData();
      Object.entries(presigned_url.fields).forEach(([key, value]) => {
        formData.append(key, value as string);
      });
      formData.append("file", file);

      await fetch(presigned_url.url, {
        method: "POST",
        body: formData,
      });

      setStatus("Saving to database...");
      await fetch("/api/upload/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset_id: asset_id,
          file_name: title,
          category: category,
          object_key: object_key
        })
      });

      setStatus("Upload successful!");
      setTitle("");
      setFile(null);
    } catch (err) {
      setStatus("Upload failed.");
    }
  };

  return (
    <form onSubmit={handleUpload} className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl">
      <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
        <UploadCloud className="text-blue-500" /> 
        Upload Asset
      </h2>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Asset Title</label>
          <input 
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Category</label>
          <select 
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
          >
            <option value="UI">UI & Interactions</option>
            <option value="Combat">Combat</option>
            <option value="Impact">Impacts & Hits</option>
            <option value="Ambience">Ambience</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Audio File (Max 10s)</label>
          <input 
            type="file"
            accept="audio/*"
            required
            onChange={handleFileChange}
            className="w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-zinc-800 file:text-white hover:file:bg-zinc-700"
          />
        </div>
      </div>

      <button 
        type="submit"
        disabled={!file}
        className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-zinc-200 transition disabled:opacity-50"
      >
        Upload to Feed
      </button>

      {status && <p className="mt-4 text-center text-sm font-mono text-zinc-400">{status}</p>}
    </form>
  );
}