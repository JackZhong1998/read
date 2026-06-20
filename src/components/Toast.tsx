"use client";

import { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  visible: boolean;
  onClose: () => void;
}

export default function Toast({ message, visible, onClose }: ToastProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        setTimeout(onClose, 300);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [visible, onClose]);

  if (!visible && !show) return null;

  return (
    <div
      className={`fixed bottom-24 left-1/2 z-50 -translate-x-1/2 transition-all duration-300 ${
        show ? "animate-toast opacity-100" : "opacity-0"
      }`}
    >
      <div className="flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm text-cream shadow-lg">
        <span className="text-accent-light">✦</span>
        <span>{message}</span>
      </div>
    </div>
  );
}
