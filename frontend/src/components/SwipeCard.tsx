import { motion, useMotionValue, useTransform, animate, PanInfo } from "framer-motion";
import { useCallback, useRef } from "react";

export type SwipeItem =
  | { type: "category"; id: string; name: string; emoji: string }
  | { type: "product"; id: string; name: string; category: string; discount_pct: number; discounted_price: number; original_price: number; days_until_expiry: number }
  | { type: "bundle"; id: string; name: string; bundle_price: number; original_total: number; bundle_discount_pct: number; skus: string[] };

const SWIPE_THRESHOLD = 0.55;
const ROTATION_STRENGTH = 0.12;

interface SwipeCardProps {
  item: SwipeItem;
  isTop: boolean;
  stackIndex: number;
  onSwipe: (item: SwipeItem, direction: "left" | "right") => void;
}

export function SwipeCard({ item, isTop, stackIndex, onSwipe }: SwipeCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, (v) => v * ROTATION_STRENGTH);
  const nopeOpacity = useTransform(x, [-80, -20], [1, 0]);
  const likeOpacity = useTransform(x, [20, 80], [0, 1]);
  const containerRef = useRef<HTMLDivElement>(null);

  const commitSwipe = useCallback(
    (direction: "left" | "right") => {
      const exitX = direction === "left" ? -500 : 500;
      animate(x, exitX, { type: "spring", stiffness: 300, damping: 30, onComplete: () => onSwipe(item, direction) });
    },
    [item, x, onSwipe]
  );

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const width = containerRef.current?.offsetWidth ?? 320;
      const threshold = width * SWIPE_THRESHOLD;
      if (info.offset.x < -threshold || info.velocity.x < -500) commitSwipe("left");
      else if (info.offset.x > threshold || info.velocity.x > 500) commitSwipe("right");
      else animate(x, 0, { type: "spring", stiffness: 300, damping: 25 });
    },
    [x, commitSwipe]
  );

  const scale = 1 - stackIndex * 0.04;
  const yOffset = stackIndex * 10;

  return (
    <div ref={containerRef} className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 10 - stackIndex }}>
      <motion.div
        drag={isTop ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={handleDragEnd}
        style={{ x: isTop ? x : 0, rotate: isTop ? rotate : 0, scale, y: yOffset }}
        className="w-72 sm:w-80 rounded-2xl overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing select-none"
      >
        <CardContent item={item} nopeOpacity={isTop ? nopeOpacity : undefined} likeOpacity={isTop ? likeOpacity : undefined} />
      </motion.div>

      {/* Swipe buttons (only on top card) */}
      {isTop && (
        <div className="absolute bottom-[-64px] flex gap-6">
          <button
            onClick={() => commitSwipe("left")}
            className="w-14 h-14 rounded-full bg-white border-2 border-[#D20002] text-[#D20002] font-black text-xl shadow-lg flex items-center justify-center hover:bg-[#D20002] hover:text-white transition-colors"
          >
            ✕
          </button>
          <button
            onClick={() => commitSwipe("right")}
            className="w-14 h-14 rounded-full bg-white border-2 border-[#4CAF50] text-[#4CAF50] font-black text-xl shadow-lg flex items-center justify-center hover:bg-[#4CAF50] hover:text-white transition-colors"
          >
            ♥
          </button>
        </div>
      )}
    </div>
  );
}

function CardContent({ item, nopeOpacity, likeOpacity }: { item: SwipeItem; nopeOpacity?: any; likeOpacity?: any }) {
  return (
    <div className="relative bg-white">
      {/* Header */}
      <div className="bg-[#00005F] px-5 py-4 flex items-center gap-2">
        <div className="grid grid-cols-2 gap-[3px] w-7 h-7 flex-shrink-0">
          <div className="rounded-sm bg-[#00A0E9]" />
          <div className="rounded-sm bg-[#FF7800]" />
          <div className="rounded-sm bg-[#FFCC00]" />
          <div className="rounded-sm bg-[#D20002]" />
        </div>
        <span className="text-white font-bold text-sm tracking-wide">ALDI Rescue</span>
        <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: typeColor(item.type), color: "#00005F" }}>
          {typeLabel(item.type)}
        </span>
      </div>

      {/* Body */}
      <div className="px-5 py-6 min-h-[180px] flex flex-col justify-center">
        {item.type === "category" && <CategoryBody item={item} />}
        {item.type === "product" && <ProductBody item={item} />}
        {item.type === "bundle" && <BundleBody item={item} />}
      </div>

      {/* NOPE overlay */}
      {nopeOpacity && (
        <motion.div
          style={{ opacity: nopeOpacity }}
          className="absolute inset-0 flex items-start justify-end pt-8 pr-6 pointer-events-none"
        >
          <span className="text-[#D20002] font-black text-3xl border-4 border-[#D20002] px-3 py-1 rounded-lg rotate-12">
            NOPE
          </span>
        </motion.div>
      )}

      {/* LIKE overlay */}
      {likeOpacity && (
        <motion.div
          style={{ opacity: likeOpacity }}
          className="absolute inset-0 flex items-start justify-start pt-8 pl-6 pointer-events-none"
        >
          <span className="text-[#4CAF50] font-black text-3xl border-4 border-[#4CAF50] px-3 py-1 rounded-lg -rotate-12">
            IGEN!
          </span>
        </motion.div>
      )}
    </div>
  );
}

function CategoryBody({ item }: { item: Extract<SwipeItem, { type: "category" }> }) {
  return (
    <div className="text-center">
      <div className="text-6xl mb-3">{item.emoji}</div>
      <h2 className="text-xl font-bold text-[#00005F] mb-2">{item.name}</h2>
      <p className="text-sm text-gray-500">Érdekel ez a kategória?</p>
    </div>
  );
}

function ProductBody({ item }: { item: Extract<SwipeItem, { type: "product" }> }) {
  const urgencyColor = item.days_until_expiry === 1 ? "#D20002" : item.days_until_expiry === 2 ? "#FF7800" : "#FFCC00";
  const urgencyText = item.days_until_expiry === 1 ? "Ma lejár!" : item.days_until_expiry === 2 ? "2 nap múlva lejár" : "3 nap múlva lejár";
  return (
    <div>
      <span className="inline-block text-xs font-bold px-2 py-0.5 rounded mb-2 text-[#00005F]" style={{ background: urgencyColor }}>
        {urgencyText}
      </span>
      <h2 className="text-lg font-bold text-[#00005F] mb-1 leading-snug">{item.name}</h2>
      <p className="text-xs text-gray-400 mb-4">{item.category}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-black text-[#D20002]">{(item.discounted_price / 100).toFixed(0)} Ft</span>
        <span className="text-sm text-gray-400 line-through">{(item.original_price / 100).toFixed(0)} Ft</span>
        <span className="ml-auto text-xs font-bold bg-[#FF7800] text-white px-2 py-0.5 rounded">-{item.discount_pct}%</span>
      </div>
    </div>
  );
}

function BundleBody({ item }: { item: Extract<SwipeItem, { type: "bundle" }> }) {
  return (
    <div>
      <div className="text-3xl mb-3">🎁</div>
      <h2 className="text-lg font-bold text-[#00005F] mb-2 leading-snug">{item.name}</h2>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-2xl font-black text-[#D20002]">{(item.bundle_price / 100).toFixed(0)} Ft</span>
        <span className="text-sm text-gray-400 line-through">{(item.original_total / 100).toFixed(0)} Ft</span>
      </div>
      <span className="inline-block text-xs font-bold bg-[#D20002] text-white px-2 py-0.5 rounded">
        -{item.bundle_discount_pct}% BUNDLE
      </span>
    </div>
  );
}

function typeLabel(type: SwipeItem["type"]) {
  return type === "category" ? "Kategória" : type === "product" ? "Termék" : "Csomag";
}
function typeColor(type: SwipeItem["type"]) {
  return type === "category" ? "#FFCC00" : type === "product" ? "#00A0E9" : "#FF7800";
}
