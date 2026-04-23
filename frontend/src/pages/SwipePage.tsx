import { useEffect, useState } from "react";
import { SwipeStack } from "../components/SwipeStack";
import type { SwipeItem } from "../components/SwipeCard";

const API_BASE = "http://localhost:8000";

const CATEGORY_MAP: Record<string, { en: string; emoji: string }> = {
  "Édesség":          { en: "Sweets & Snacks",      emoji: "🍫" },
  "Egyéb non-food":   { en: "Other Non-Food",        emoji: "🔧" },
  "Grillezős food":   { en: "Grill Food",            emoji: "🔥" },
  "Grillezős non-food":{ en: "Grill Accessories",    emoji: "🪵" },
  "Pékáru":           { en: "Bakery",                emoji: "🥐" },
  "Szeszes ital":     { en: "Alcoholic Drinks",      emoji: "🍺" },
  "Tejtermék":        { en: "Dairy",                 emoji: "🥛" },
  "Tésztaféle":       { en: "Pasta & Grains",        emoji: "🍝" },
  "Üdítő ital":       { en: "Soft Drinks",           emoji: "🥤" },
  "Üveges ital":      { en: "Bottled Drinks",        emoji: "🍶" },
  "Zöldség":          { en: "Vegetables & Produce",  emoji: "🥦" },
};

function translateCategory(hu: string): string {
  return CATEGORY_MAP[hu]?.en ?? hu;
}

export default function SwipePage() {
  const params = new URLSearchParams(window.location.search);
  const userId = params.get("user_id") ?? "1";

  const [userName, setUserName] = useState<string>("");
  const [items, setItems] = useState<SwipeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [swiped, setSwiped] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        // 1. Get user name
        const usersRes = await fetch(`${API_BASE}/users`);
        const usersData = await usersRes.json();
        const users: any[] = usersData.data ?? usersData;
        const user = Array.isArray(users)
          ? users.find((u: any) => String(u.id ?? u.user_id) === String(userId))
          : null;
        if (user) setUserName((user.name ?? "").split(" ")[0]);

        // 2. Get payload — products + bundles via POST /generate/{user_id}
        const payloadRes = await fetch(`${API_BASE}/generate/${userId}?use_ai=false`, {
          method: "POST",
        });
        const payload = await payloadRes.json();

        // 3. Category cards — one per unique category from the API's category list
        const allCategories = Object.keys(CATEGORY_MAP);
        const categoryItems: SwipeItem[] = allCategories.map((hu) => ({
          type: "category",
          id: `cat-${hu}`,
          name: CATEGORY_MAP[hu].en,
          emoji: CATEGORY_MAP[hu].emoji,
        }));

        // 4. Product cards — from ranked payload
        const productItems: SwipeItem[] = (payload.products ?? [])
          .slice(0, 8)
          .map((p: any) => ({
            type: "product",
            id: `prod-${p.id ?? p.sku}`,
            name: p.name ?? p.title ?? "Product",
            category: translateCategory(p.category ?? ""),
            discount_pct: p.discount_pct ?? p.chosen_discount_pct ?? 0,
            discounted_price: p.discounted_price ?? p.discounted_price_huf ?? 0,
            original_price: p.original_price ?? p.price_huf ?? 0,
            days_until_expiry: p.days_until_expiry ?? p.expiry_days ?? 3,
          }));

        // 5. Bundle cards — from payload bundles
        const bundleItems: SwipeItem[] = (payload.bundles ?? []).map(
          (b: any, i: number) => ({
            type: "bundle",
            id: `bundle-${i}`,
            name: b.name ?? "Bundle Deal",
            bundle_price: b.bundle_price ?? 0,
            original_total: b.original_total ?? 0,
            bundle_discount_pct: b.bundle_discount_pct ?? 0,
            skus: b.skus ?? [],
          })
        );

        const allItems = [...categoryItems, ...productItems, ...bundleItems];
        setItems(allItems);
        setTotal(allItems.length);
      } catch (err) {
        console.error("Failed to load swipe data", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId]);

  function handleSwipe(item: SwipeItem, direction: "left" | "right") {
    setSwiped((s) => s + 1);
    fetch(`${API_BASE}/swipe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        item_type: item.type,
        item_id: item.id,
        item_name: item.name,
        liked: direction === "right",
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {});
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#00005F] flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-3 animate-pulse">🛒</div>
          <p className="text-[#FFCC00] font-bold">Loading your deals...</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#00005F] flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-black text-white mb-2">
            Thanks{userName ? `, ${userName}` : ""}!
          </h1>
          <p className="text-[#00A0E9] mb-6">
            We'll use your preferences to send you even better rescue deals next time.
          </p>
          <div className="bg-white/10 rounded-xl p-4">
            <div className="font-bold text-[#FFCC00] text-2xl">{swiped}</div>
            <div className="text-white/70 text-sm">items rated</div>
          </div>
          <p className="text-white/30 text-xs mt-6">You can close this window.</p>
        </div>
      </div>
    );
  }

  const progress = total > 0 ? Math.round((swiped / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#00005F] flex flex-col items-center px-4">
      {/* Header */}
      <div className="w-full max-w-sm pt-8 pb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="grid grid-cols-2 gap-[3px] w-6 h-6">
              <div className="rounded-sm bg-[#00A0E9]" />
              <div className="rounded-sm bg-[#FF7800]" />
              <div className="rounded-sm bg-[#FFCC00]" />
              <div className="rounded-sm bg-[#D20002]" />
            </div>
            <span className="text-white font-black text-lg">
              ALDI <span className="text-[#00A0E9]">Rescue</span>
            </span>
          </div>
          {userName && (
            <p className="text-white/60 text-xs">Hi, {userName}! 👋</p>
          )}
        </div>
        <div className="text-right">
          <div className="text-[#FFCC00] font-bold text-sm">
            {swiped}/{total}
          </div>
          <div className="text-white/40 text-xs">rated</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-sm mb-6">
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#FF7800] rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Swipe hint */}
      <div className="flex items-center gap-6 mb-8 text-xs text-white/40">
        <span>← Not interested</span>
        <span className="text-white/20">|</span>
        <span>Interested →</span>
      </div>

      {/* Card stack */}
      <div className="flex-1 flex flex-col items-center justify-start">
        <SwipeStack
          items={items}
          onSwipe={handleSwipe}
          onComplete={() => setDone(true)}
        />
      </div>
    </div>
  );
}
