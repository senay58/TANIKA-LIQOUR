import { Category, categories, categoryEmojis } from "@/lib/inventory-data";

interface CategoryFilterProps {
  selected: string;
  onSelect: (category: string) => void;
  categories: any[];
}

export function CategoryFilter({ selected, onSelect, categories }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelect("All")}
        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selected === "All"
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          }`}
      >
        All
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id || cat.name}
          onClick={() => onSelect(cat.name)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selected === cat.name
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
        >
          {cat.emoji} {cat.name}
        </button>
      ))}
    </div>
  );
}
