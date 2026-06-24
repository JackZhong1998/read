"use client";

import { useEffect, useState } from "react";
import { downloadPoster, sharePoster } from "@/lib/share-poster";

interface SharePosterModalProps {
  imageUrl: string;
  blob: Blob;
  bookTitle: string;
  onClose: () => void;
}

export default function SharePosterModal({
  imageUrl,
  blob,
  bookTitle,
  onClose,
}: SharePosterModalProps) {
  const [sharing, setSharing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const handleShare = async () => {
    setSharing(true);
    setMessage(null);
    try {
      const ok = await sharePoster(blob, bookTitle);
      if (!ok) {
        setMessage("当前环境不支持系统分享，请使用保存后手动分享");
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setMessage("分享失败，请重试");
      }
    } finally {
      setSharing(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await downloadPoster(blob);
      setMessage("图片已保存，可在相册或文件中查看");
    } catch {
      setMessage("请长按图片保存到相册");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="flex flex-1 items-center justify-center p-6 pt-[max(24px,env(safe-area-inset-top))]">
        <div
          className="relative max-h-[min(70vh,640px)] w-full max-w-sm overflow-hidden rounded-2xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="分享海报"
            className="h-full w-full object-contain"
          />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent px-4 pb-4 pt-10">
            <button
              type="button"
              onClick={handleShare}
              disabled={sharing}
              className="rounded-full bg-white/95 px-5 py-2.5 text-sm font-medium text-[#2a2520] shadow-sm transition-transform active:scale-95 disabled:opacity-60"
            >
              {sharing ? "分享中..." : "分享"}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-full bg-[#c45c26] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-transform active:scale-95 disabled:opacity-60"
            >
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
      </div>

      <div className="shrink-0 px-6 pb-[max(20px,env(safe-area-inset-bottom))] text-center">
        {message && <p className="mb-3 text-xs text-white/80">{message}</p>}
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/30 px-6 py-2 text-sm text-white"
        >
          关闭
        </button>
      </div>
    </div>
  );
}
