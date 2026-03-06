import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size="icon"
      className="rounded-full bg-background/50 backdrop-blur-md border border-border/50 hover:bg-background/80 relative overflow-hidden h-10 w-10"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
    >
      <AnimatePresence mode="wait" initial={false}>
        {theme === "dark" || theme === "system" ? (
          <motion.div
            key="moon"
            initial={{ y: -30, opacity: 0, rotate: -90 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: 30, opacity: 0, rotate: 90 }}
            transition={{ duration: 0.5, type: "spring", stiffness: 200, damping: 10 }}
            className="absolute inset-0 flex items-center justify-center text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]"
          >
            <Moon className="h-6 w-6" />
          </motion.div>
        ) : (
          <motion.div
            key="sun"
            initial={{ y: -30, opacity: 0, rotate: -90 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: 30, opacity: 0, rotate: 90 }}
            transition={{ duration: 0.5, type: "spring", stiffness: 200, damping: 10 }}
            className="absolute inset-0 flex items-center justify-center text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]"
          >
            <Sun className="h-6 w-6" />
          </motion.div>
        )}
      </AnimatePresence>
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
