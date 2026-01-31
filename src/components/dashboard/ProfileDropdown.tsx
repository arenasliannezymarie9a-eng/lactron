import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Sun,
  Moon,
  History,
  LogOut,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { authAPI } from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProfileDropdownProps {
  isDark: boolean;
  onToggleTheme: () => void;
  onViewHistory: () => void;
}

const ProfileDropdown = ({
  isDark,
  onToggleTheme,
  onViewHistory,
}: ProfileDropdownProps) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 1 && hour < 12) return "Good morning";
    if (hour >= 12 && hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const handleLogout = async () => {
    await authAPI.logout();
    toast.success("Logged out successfully");
    navigate("/");
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-10 h-10 rounded-full bg-secondary/80 border border-border/50 flex items-center justify-center hover:bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <User className="w-5 h-5 text-foreground" />
        </motion.button>
      </DropdownMenuTrigger>

      <AnimatePresence>
        {isOpen && (
          <DropdownMenuContent
            asChild
            align="end"
            sideOffset={8}
            className="w-56"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15 }}
              className="bg-popover border border-border rounded-xl shadow-lg p-1"
            >
              {/* Greeting */}
              <div className="px-3 py-2.5 text-sm font-medium text-foreground">
                {getGreeting()} 👋
              </div>

              <DropdownMenuSeparator className="bg-border/50" />

              {/* Mode Selector */}
              <DropdownMenuItem
                onClick={onToggleTheme}
                className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg hover:bg-secondary/80 transition-colors"
              >
                <motion.div
                  key={isDark ? "dark" : "light"}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {isDark ? (
                    <Sun className="w-4 h-4 text-amber-500" />
                  ) : (
                    <Moon className="w-4 h-4 text-primary" />
                  )}
                </motion.div>
                <span className="text-sm">
                  {isDark ? "Light Mode" : "Dark Mode"}
                </span>
              </DropdownMenuItem>

              {/* Batch History */}
              <DropdownMenuItem
                onClick={onViewHistory}
                className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg hover:bg-secondary/80 transition-colors"
              >
                <History className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Batch History</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-border/50" />

              {/* Logout */}
              <DropdownMenuItem
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Logout</span>
              </DropdownMenuItem>
            </motion.div>
          </DropdownMenuContent>
        )}
      </AnimatePresence>
    </DropdownMenu>
  );
};

export default ProfileDropdown;
