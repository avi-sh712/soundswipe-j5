"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, PanInfo } from "framer-motion";
import { Howl } from "howler";
import { Heart, Download, Share2, Play, Pause, Sparkles, Upload, Loader2 } from "lucide-react";
import Link from "next/link";
import useAppStore from "../store/useAppStore";
import DesktopControls from "./DesktopControls";
import ProModal from "./ProModal";

export default function SwipeFeed() {
  const [feed, setFeed] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const soundRef = useRef<Howl | null>(null);

  const { likedAssets, toggleLike, currentCategory } = useAppStore();

  useEffect(() => {
    const fetchFeed = async () => {
      setIsLoading(true);
      try {
        let res;
        const likedArray = Array.from(likedAssets);
        
        if (likedArray.length > 0) {
          res = await fetch("/api/feed/recommendations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ liked_asset_ids: likedArray })
          });
        } else {
          res = await fetch(`/api/feed/${currentCategory}`);
        }
        
        const data = await res.json();
        setFeed(data.assets || []);
        setCurrentIndex(0);
      } catch (err) {
        setFeed([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFeed();
  }, [currentCategory, likedAssets.size]);

  const currentAsset = feed[currentIndex];
  const isLiked = currentAsset ? likedAssets.has(currentAsset.id) : false;

  useEffect(() => {
    if (soundRef.current) {
      soundRef.current.unload();
    }

    if (currentAsset) {
      soundRef.current = new Howl({
        src: [currentAsset.url],
        loop: true,
        html5: true,
        onplay: () => setIsPlaying(true),
        onpause: () => setIsPlaying(false),
        onend: () => setIsPlaying(false)
      });

      if (isPlaying) {
        soundRef.current.play();
      }
    }

    return () => {
      if (soundRef.current) {
        soundRef.current.unload();
      }
    };
  }, [currentIndex, currentAsset]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") handleNext();
      if (e.key === "ArrowUp") handlePrev();
      if (e.key === " ") {
        e.preventDefault();
        handleTogglePlay();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, isPlaying, feed.length]);

  const handleTogglePlay = () => {
    if (!soundRef.current) return;
    if (isPlaying) {
      soundRef.current.pause();
    } else {
      soundRef.current.play();
    }
  };

  const handleNext = () => {
    if (currentIndex < feed.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsPlaying(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setIsPlaying(true);
    }
  };

  const handleDragEnd = (e: any, info: PanInfo) => {
    if (info.offset.y < -50) {
      handleNext();
    } else if (info.offset.y > 50) {
      handlePrev();
    }
  };

  const handleLike = async () => {
    if (!currentAsset) return;
    toggleLike(currentAsset.id);

    try {
      await fetch(`/api/feed/like/${currentAsset.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: "demo_user_123",
          asset_data: { name: currentAsset.name, category: currentAsset.category }
        })
      });
    } catch (err) {}
  };

  if (isLoading) {
    return (
      <div className="flex h-full w-full max-w-md items-center justify-center bg-zinc-900 border-x border-zinc-800">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  if (feed.length === 0) {
    return (
      <div className="flex h-full w-full max-w-md flex-col items-center justify-center bg-zinc-900 border-x border-zinc-800 p-6 text-center">
        <h2 className="text-xl font-bold text-white mb-4">No sounds found!</h2>
        <p className="text-zinc-400 mb-6">Upload some audio to the {currentCategory} category to get started.</p>
        <Link href="/upload" className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl transition">
          Go to Upload
        </Link>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full max-w-md bg-zinc-900 shadow-2xl border-x border-zinc-800 flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute top-0 left-0 right-0 p-6 z-10 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
        <h1 className="font-bold text-xl tracking-tight text-white flex items-center gap-2">
          <Sparkles size={20} className="text-blue-500" />
          FoleySwipe
        </h1>
        <div className="flex gap-3 items-center">
          <span className="bg-zinc-800 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider text-zinc-300">
            {currentAsset.category}
          </span>
          <Link href="/upload" className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition cursor-pointer z-50">
            <Upload size={18} className="text-white" />
          </Link>
        </div>
      </div>

      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        onDragEnd={handleDragEnd}
        className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center cursor-grab active:cursor-grabbing"
      >
        <div
          className={`mb-8 h-48 w-48 rounded-full border-4 flex items-center justify-center transition-all duration-300 ${
            isPlaying ? "border-green-500 scale-105 shadow-[0_0_30px_rgba(34,197,94,0.4)]" : "border-zinc-700"
          }`}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleTogglePlay();
            }}
            className="rounded-full bg-zinc-800 p-6 hover:bg-zinc-700 transition"
          >
            {isPlaying ? <Pause size={48} /> : <Play size={48} className="ml-2" />}
          </button>
        </div>

        <h2 className="text-3xl font-bold tracking-tight mb-2 select-none pointer-events-none">{currentAsset.name}</h2>
        <p className="text-zinc-500 font-mono text-sm select-none pointer-events-none">ID: {currentAsset.id}</p>
      </motion.div>

      <div className="absolute bottom-32 right-4 flex flex-col items-center gap-6 z-20">
        <button onClick={handleLike} className="flex flex-col items-center gap-1 group">
          <div className={`rounded-full p-3 transition ${isLiked ? 'bg-red-500/20 text-red-500' : 'bg-zinc-800/80 text-white group-hover:text-red-400'}`}>
            <Heart size={28} fill={isLiked ? "currentColor" : "none"} />
          </div>
          <span className="text-xs font-semibold text-white drop-shadow-md">Save</span>
        </button>
        
        <button onClick={() => setShowProModal(true)} className="flex flex-col items-center gap-1 group">
          <div className="rounded-full bg-zinc-800/80 p-3 text-white group-hover:text-blue-400 transition">
            <Download size={28} />
          </div>
          <span className="text-xs font-semibold text-white drop-shadow-md">Export</span>
        </button>

        <button className="flex flex-col items-center gap-1 group">
          <div className="rounded-full bg-zinc-800/80 p-3 text-white group-hover:text-green-400 transition">
            <Share2 size={28} />
          </div>
          <span className="text-xs font-semibold text-white drop-shadow-md">Share</span>
        </button>
      </div>

      <DesktopControls onNext={handleNext} onPrev={handlePrev} />

      {showProModal && <ProModal onClose={() => setShowProModal(false)} />}
    </div>
  );
}