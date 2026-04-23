import { useState, useCallback } from "react";
import { SwipeCard, SwipeItem } from "./SwipeCard";

interface SwipeStackProps {
  items: SwipeItem[];
  onSwipe: (item: SwipeItem, direction: "left" | "right") => void;
  onComplete: () => void;
}

export function SwipeStack({ items: initialItems, onSwipe, onComplete }: SwipeStackProps) {
  const [remaining, setRemaining] = useState<SwipeItem[]>(initialItems);

  const handleSwipe = useCallback(
    (item: SwipeItem, direction: "left" | "right") => {
      onSwipe(item, direction);
      setRemaining((prev) => {
        const next = prev.filter((i) => i.id !== item.id);
        if (next.length === 0) onComplete();
        return next;
      });
    },
    [onSwipe, onComplete]
  );

  if (remaining.length === 0) return null;

  // Render top 3 cards (top card + 2 depth cards behind)
  const visible = remaining.slice(0, 3);

  return (
    <div className="relative w-72 sm:w-80 h-72">
      {[...visible].reverse().map((item, reversedIndex) => {
        const stackIndex = visible.length - 1 - reversedIndex;
        return (
          <SwipeCard
            key={item.id}
            item={item}
            isTop={stackIndex === 0}
            stackIndex={stackIndex}
            onSwipe={handleSwipe}
          />
        );
      })}
    </div>
  );
}
