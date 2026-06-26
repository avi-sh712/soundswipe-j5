"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, AudioLines, AlertCircle } from "lucide-react";
import useAppStore from "../store/useAppStore";
import { CATEGORIES } from "../lib/categories";
import {
  getFeed,
  getRecommendations,
  likeAsset,
  type SoundAsset,
} from "../lib/api";
import SoundCard from "./SoundCard";
import ProModal from "./ProModal";

export default function SwipeFeed() {
  const [feed, setFeed] = useState<SoundAsset[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [activeIndex, setActiveIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [showProModal, setShowProModal] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const { likedAssets, toggleLike, currentCategory, setCategory } = useAppStore();
  const likedCount = likedAssets.size;

  // Fetch the feed whenever category or like-set changes.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setStatus("loading");
      try {
        const likedArray = Array.from(likedAssets);
        const assets =
          currentCategory === "All" && likedArray.length > 0
            ? await getRecommendations(likedArray)
            : await getFeed(currentCategory);
        if (cancelled) return;
        setFeed(assets);
        setActiveIndex(0);
        setPlaying(false);
        setStatus("ready");
        containerRef.current?.scrollTo({ top: 0 });
      } catch {
        if (!cancelled) setStatus("error");
      }
    };
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCategory, likedCount]);

  // Track the active card via IntersectionObserver (smooth, lag-free scrolling).
  useEffect(() => {
    const root = containerRef.current;
    if (!root || feed.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(
              (entry.target as HTMLElement).dataset.index ?? "0",
            );
            setActiveIndex(idx);
            setPlaying(true);
          }
        });
      },
      { root, threshold: 0.6 },
    );

    cardRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [feed]);

  const scrollToIndex = useCallback((idx: number) => {
    const el = cardRefs.current[idx];
    el?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Keyboard navigation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        scrollToIndex(Math.min(activeIndex + 1, feed.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        scrollToIndex(Math.max(activeIndex - 1, 0));
      } else if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIndex, feed.length, scrollToIndex]);

  const handleLike = useCallback(
    async (asset: SoundAsset) => {
      const wasLiked = likedAssets.has(asset.id);
      toggleLike(asset.id);
      if (!wasLiked) {
        try {
          await likeAsset(asset.id, {
            name: asset.name,
            category: asset.category,
          });
        } catch {
          /* server sync best-effort; local state already updated */
        }
      }
    },
    [likedAssets, toggleLike],
  );

  const header = useMemo(
    () => (
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-3 bg-gradient-to-b from-background via-background/70 to-transparent px-4 pb-8 pt-5">
        <div className="pointer-events-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AudioLines className="text-accent" size={22} />
            <span className="text-lg font-bold tracking-tight">SoundSwipe</span>
          </div>
          <Link
            href="/upload"
            className="flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-2 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
          >
            <Plus size={16} />
            Upload
          </Link>
        </div>

        {/* Category chips */}
        <div className="no-scrollbar pointer-events-auto -mx-4 flex gap-2 overflow-x-auto px-4">
          {CATEGORIES.map((cat) => {
            const isActive = cat.value === currentCategory;
            return (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-foreground text-background"
                    : "bg-surface-2/80 text-muted hover:text-foreground"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </header>
    ),
    [currentCategory, setCategory],
  );

  return (
    <div className="relative mx-auto h-[100dvh] w-full max-w-md overflow-hidden bg-background ring-1 ring-border md:rounded-3xl md:my-4 md:h-[calc(100dvh-2rem)]">
      {header}

      {status === "loading" && (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="animate-spin text-accent" size={40} />
        </div>
      )}

      {status === "error" && (
        <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
          <AlertCircle className="text-like" size={40} />
          <h2 className="text-lg font-bold">Couldn&apos;t reach the library</h2>
          <p className="text-sm text-muted">
            We couldn&apos;t connect to the audio backend. Check that
            NEXT_PUBLIC_API_BASE_URL points to your AWS endpoint.
          </p>
          <button
            onClick={() => setCategory(currentCategory)}
            className="rounded-xl bg-foreground px-5 py-2.5 text-sm font-semibold text-background"
          >
            Retry
          </button>
        </div>
      )}

      {status === "ready" && feed.length === 0 && (
        <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
          <AudioLines className="text-muted" size={40} />
          <h2 className="text-lg font-bold">No sounds here yet</h2>
          <p className="text-sm text-muted">
            Be the first to add a clip to this category.
          </p>
          <Link
            href="/upload"
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground"
          >
            Upload a sound
          </Link>
        </div>
      )}

      {status === "ready" && feed.length > 0 && (
        <div
          ref={containerRef}
          className="no-scrollbar h-full snap-y snap-mandatory overflow-y-scroll scroll-smooth"
        >
          {feed.map((asset, idx) => (
            <div
              key={asset.id}
              data-index={idx}
              ref={(el) => {
                cardRefs.current[idx] = el;
              }}
            >
              <SoundCard
                asset={asset}
                active={idx === activeIndex}
                playing={idx === activeIndex && playing}
                liked={likedAssets.has(asset.id)}
                onTogglePlay={() => setPlaying((p) => !p)}
                onLike={() => handleLike(asset)}
                onExport={() => setShowProModal(true)}
              />
            </div>
          ))}
        </div>
      )}

      {showProModal && <ProModal onClose={() => setShowProModal(false)} />}
    </div>
  );
}
