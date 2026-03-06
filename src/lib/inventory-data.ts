export type Category = "Whiskey" | "Vodka" | "Gin" | "Rum" | "Tequila" | "Wine" | "Beer" | "Brandy" | "Liqueur";

export interface Product {
  id: string;
  name: string;
  category: string;
  categoryEmoji?: string;
  brand: string;
  priceIn: number;
  priceOut: number;
  quantity: number;
  minStock: number;
  volume: string;
  imageUrl?: string;
}

export const categories: Category[] = ["Whiskey", "Vodka", "Gin", "Rum", "Tequila", "Wine", "Beer", "Brandy", "Liqueur"];

export const categoryEmojis: Record<Category, string> = {
  Whiskey: "🥃",
  Vodka: "🍸",
  Gin: "🫒",
  Rum: "🏴‍☠️",
  Tequila: "🌵",
  Wine: "🍷",
  Beer: "🍺",
  Brandy: "🥂",
  Liqueur: "🍹",
};

export const initialProducts: Product[] = [
  { id: "1", name: "Jack Daniel's Old No. 7", category: "Whiskey", brand: "Jack Daniel's", priceIn: 22.00, priceOut: 29.99, quantity: 24, minStock: 10, volume: "750ml" },
  { id: "2", name: "Johnnie Walker Black Label", category: "Whiskey", brand: "Johnnie Walker", priceIn: 30.00, priceOut: 39.99, quantity: 18, minStock: 8, volume: "750ml" },
  { id: "3", name: "Grey Goose Original", category: "Vodka", brand: "Grey Goose", priceIn: 26.00, priceOut: 34.99, quantity: 15, minStock: 8, volume: "750ml" },
  { id: "4", name: "Absolut Vodka", category: "Vodka", brand: "Absolut", priceIn: 14.00, priceOut: 19.99, quantity: 30, minStock: 12, volume: "750ml" },
  { id: "5", name: "Hendrick's Gin", category: "Gin", brand: "Hendrick's", priceIn: 28.00, priceOut: 36.99, quantity: 12, minStock: 6, volume: "750ml" },
  { id: "6", name: "Bombay Sapphire", category: "Gin", brand: "Bombay", priceIn: 18.00, priceOut: 24.99, quantity: 20, minStock: 8, volume: "750ml" },
  { id: "7", name: "Bacardi Superior", category: "Rum", brand: "Bacardi", priceIn: 10.00, priceOut: 14.99, quantity: 35, minStock: 15, volume: "750ml" },
  { id: "8", name: "Captain Morgan Spiced", category: "Rum", brand: "Captain Morgan", priceIn: 13.00, priceOut: 18.99, quantity: 28, minStock: 10, volume: "750ml" },
  { id: "9", name: "Patrón Silver", category: "Tequila", brand: "Patrón", priceIn: 35.00, priceOut: 44.99, quantity: 8, minStock: 5, volume: "750ml" },
  { id: "10", name: "Don Julio Reposado", category: "Tequila", brand: "Don Julio", priceIn: 42.00, priceOut: 54.99, quantity: 6, minStock: 4, volume: "750ml" },
  { id: "11", name: "Château Margaux 2018", category: "Wine", brand: "Château Margaux", priceIn: 65.00, priceOut: 89.99, quantity: 4, minStock: 3, volume: "750ml" },
  { id: "12", name: "Moët & Chandon Brut", category: "Wine", brand: "Moët", priceIn: 38.00, priceOut: 49.99, quantity: 10, minStock: 5, volume: "750ml" },
  { id: "13", name: "Heineken Lager", category: "Beer", brand: "Heineken", priceIn: 7.00, priceOut: 9.99, quantity: 48, minStock: 24, volume: "6-pack" },
  { id: "14", name: "Guinness Draught", category: "Beer", brand: "Guinness", priceIn: 8.50, priceOut: 11.99, quantity: 36, minStock: 18, volume: "6-pack" },
  { id: "15", name: "Hennessy VS", category: "Brandy", brand: "Hennessy", priceIn: 29.00, priceOut: 38.99, quantity: 14, minStock: 6, volume: "750ml" },
  { id: "16", name: "Kahlúa Coffee Liqueur", category: "Liqueur", brand: "Kahlúa", priceIn: 16.00, priceOut: 22.99, quantity: 3, minStock: 5, volume: "750ml" },
];
