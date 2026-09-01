"use client";

import { useState } from "react";
import type { ShopItem } from "../../src/lib/shopItems";

export default function RedeemCatalog({
  items,
  initialBalance,
}: {
  items: ShopItem[];
  initialBalance: number;
}) {
  const [balance, setBalance] = useState(initialBalance);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function redeem(item: ShopItem) {
    setPending(item.name);
    setError(null);
    try {
      const response = await fetch("/api/shop/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemName: item.name }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(
          data.error === "insufficient_balance"
            ? `Not enough tokens for ${item.name}.`
            : "Redemption failed. Try again.",
        );
        return;
      }
      setBalance(data.balance);
    } finally {
      setPending(null);
    }
  }

  return (
    <>
      <p className="text-4xl text-left mb-2">your balance: {balance.toFixed(1)} tokens</p>
      {error && <p className="text-error mb-4">{error}</p>}

      <div className="flex flex-row flex-wrap gap-4">
        {items.map((item, i) => {
          const canAfford = balance >= item.price;
          return (
            <div key={i} className="p-3 w-fit w-40 border-b border-r border-dashed">
              <img src={item.img} className="w-full object-cover h-40 rounded-lg" />
              <div className="flex gap-2 items-center flex-row">
                <p className="text-error text-2xl">~{item.price}</p>
                <p> hours</p>
              </div>
              <p>{item.name}</p>
              <button
                className="btn btn-sm mt-2"
                disabled={!canAfford || pending === item.name}
                onClick={() => redeem(item)}
              >
                {pending === item.name ? "Redeeming..." : "Redeem"}
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
