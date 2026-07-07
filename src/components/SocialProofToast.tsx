"use client";

import { useState, useEffect } from "react";
import { useProducts } from "@/lib/db/useProducts";

const NAMES = ["Nino", "Ana", "Mari", "Lika", "Tamara", "Salome", "Elene", "Khatia", "Tamar", "Mariam"];
const CITIES = ["Tbilisi", "Kutaisi", "Batumi", "Rustavi", "Gori", "Zugdidi"];

function pick<T>(arr: T[], seed: number): T {
  const x = Math.abs(Math.sin(seed + 1)) * 10000;
  return arr[Math.floor((x % 1) * arr.length)];
}

interface ToastData {
  name: string;
  city: string;
  emoji: string;
  cardColor: string;
  productName: string;
  minutesAgo: number;
}

export default function SocialProofToast() {
  const products = useProducts();
  const [visible, setVisible] = useState(false);
  const [data, setData] = useState<ToastData | null>(null);

  useEffect(() => {
    if (products.length === 0) return;
    let counter = 0;
    let t2: ReturnType<typeof setTimeout>;
    let t3: ReturnType<typeof setTimeout>;

    function show() {
      counter++;
      const s = counter;
      const prod = pick(products, s * 11);
      setData({
        name: pick(NAMES, s * 3),
        city: pick(CITIES, s * 7),
        emoji: prod.emoji,
        cardColor: prod.cardColor,
        productName: prod.name,
        minutesAgo: Math.floor(Math.abs(Math.sin(s * 13 + 5)) * 22) + 2,
      });
      setVisible(true);

      t2 = setTimeout(() => {
        setVisible(false);
        t3 = setTimeout(show, 28000 + Math.random() * 8000);
      }, 4500);
    }

    const t1 = setTimeout(show, 9000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products.length]);

  if (!data) return null;

  return (
    <div
      className={`fixed bottom-24 sm:bottom-24 left-4 sm:left-6 z-[300] max-w-[280px] transition-all duration-500 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none"
      }`}
    >
      <div className="bg-white rounded-2xl shadow-xl border border-[#DDD5CC] p-3.5 flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{ backgroundColor: data.cardColor }}
        >
          {data.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs leading-snug">
            <span className="font-bold text-[#5E9E8C]">{data.name}</span>
            <span className="text-[#5E5450]"> from {data.city}</span>
          </p>
          <p className="text-xs text-[#5E5450] leading-snug line-clamp-1">
            just bought <span className="font-bold text-[#2A2320]">{data.productName}</span>
          </p>
          <p className="text-[10px] text-[#9A8E88] mt-0.5">
            {data.minutesAgo <= 2 ? "just now" : `${data.minutesAgo} min ago`} · 🔥 Popular
          </p>
        </div>
        <button
          onClick={() => setVisible(false)}
          aria-label="Dismiss"
          className="w-5 h-5 rounded-full bg-[#F5F0EB] hover:bg-[#EDE5D8] flex items-center justify-center text-[#9A8E88] text-[10px] flex-shrink-0 transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
