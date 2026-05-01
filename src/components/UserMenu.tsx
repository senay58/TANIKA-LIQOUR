import { Settings, LogOut, Moon, Sun, User } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserMenuProps {
  onSettingsClick: () => void;
  onLogoutClick: () => void;
}

export function UserMenu({ onSettingsClick, onLogoutClick }: UserMenuProps) {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="rounded-full bg-slate-950/90 backdrop-blur-xl border-white/30 h-10 w-10 text-white hover:bg-slate-900 transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)] active:scale-95"
          title="Account & Settings"
        >
          <User className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 bg-slate-950/95 backdrop-blur-2xl border-white/20 text-white p-2 rounded-2xl shadow-2xl">
        <DropdownMenuLabel className="font-display text-sm opacity-70 px-3 py-2">Admin Panel</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10 my-1" />
        
        <DropdownMenuItem 
          onClick={() => setTheme(theme === "light" ? "dark" : "light")} 
          className="rounded-xl cursor-pointer focus:bg-white/10 focus:text-white transition-all py-3 px-3"
        >
          {theme === "dark" ? (
            <div className="flex items-center gap-3">
              <div className="bg-yellow-500/20 p-2 rounded-lg">
                <Sun className="h-4 w-4 text-yellow-500" />
              </div>
              <div className="flex flex-col">
                <span className="font-medium">Light Mode</span>
                <span className="text-[10px] opacity-50">Switch to bright theme</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="bg-blue-400/20 p-2 rounded-lg">
                <Moon className="h-4 w-4 text-blue-400" />
              </div>
              <div className="flex flex-col">
                <span className="font-medium">Dark Mode</span>
                <span className="text-[10px] opacity-50">Switch to night theme</span>
              </div>
            </div>
          )}
        </DropdownMenuItem>

        <DropdownMenuItem 
          onClick={onSettingsClick} 
          className="rounded-xl cursor-pointer focus:bg-white/10 focus:text-white transition-all py-3 px-3 mt-1"
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-lg">
              <Settings className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-medium">Settings</span>
              <span className="text-[10px] opacity-50">System configurations</span>
            </div>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-white/10 my-1" />
        
        <DropdownMenuItem 
          onClick={onLogoutClick} 
          className="rounded-xl cursor-pointer focus:bg-red-500/20 text-red-400 focus:text-red-300 transition-all py-3 px-3"
        >
          <div className="flex items-center gap-3">
            <div className="bg-red-500/20 p-2 rounded-lg">
              <LogOut className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-medium">Logout</span>
              <span className="text-[10px] opacity-50">End your session</span>
            </div>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
