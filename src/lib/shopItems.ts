export type ShopItem = {
  img: string;
  name: string;
  price: number;
};

export const allShopItems: ShopItem[] = [
  // LVL 1 CLEARANCE — 1 hour
  { name: "One Key Keychain", price: 1, img: "/prizes/keychain_image.jpg" },
  { name: "$6.5/hr Hardware Grant", price: 1, img: "/prizes/grant_image.jpg" },
  { name: "$5.00/hr Upgrade Grant", price: 1, img: "/prizes/grant_image.jpg" },

  // LVL 2 CLEARANCE — 3 hours
  { name: "$20 AI Grant", price: 3, img: "/prizes/claude_vs_gemini.png" },
  { name: "$20 Domain Grant", price: 3, img: "/prizes/porkbun.png" },
  { name: "Four Key Macropad", price: 3, img: "/prizes/macropad_image.jpg" },

  // LVL 3 CLEARANCE — 15 hours
  { name: "Casio Watch", price: 15, img: "/prizes/casio_image.jpg" },
  { name: "ProtonMe 1 year subscription", price: 15, img: "/prizes/protonMe.jpg" },
  { name: "TryHackMe 6 month subscription", price: 15, img: "/prizes/tryHackMe.png" },
  { name: "EPOMAKER TH99 PRO Keyboard", price: 15, img: "/prizes/creamy_keyboard.jpg" },
  { name: "Anker Nano Charger (100W) with USB-C Cable", price: 15, img: "/prizes/anker_image.png" },

  // LVL 4 CLEARANCE — 25 hours
  { name: "144Hz Curved Monitor", price: 25, img: "/prizes/minotor_pic.avif" },


  // LVL 5 CLEARANCE — 50 hours
  { name: "GoPro HERO12 Black", price: 50, img: "/prizes/gopro.jpg" },
  { name: "Flipper Zero", price: 35, img: "/prizes/flipper_zero_img.webp" },
  { name: "Thinkpad T14 (Gen 2)", price: 50, img: "/prizes/thinkpad_laptop_img.jpg" },
  { name: "Hack The Box VIP+ 1 Year Subscription", price: 50, img: "/prizes/hackthebox.png" },
  { name: "Sony WH-1000XM5 Wireless Noise Canceling Headphones (Black)", price: 50, img: "/prizes/headphones.png" },
  { name: "Meta Glasses Gen 1", price: 50, img: "/prizes/metaGlasses.jpeg" },

  { name: "Gaming PC with a 4060", price: 200, img: "/prizes/gaming_pc_img.webp" },
];

export function findShopItemByName(name: string): ShopItem | undefined {
  return allShopItems.find((item) => item.name === name);
}
