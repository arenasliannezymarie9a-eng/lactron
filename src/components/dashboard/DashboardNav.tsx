import { motion } from "framer-motion";
import { Zap, Sun, Moon, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface DashboardNavProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

const DashboardNav = ({ isDark, onToggleTheme }: DashboardNavProps) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    toast.success("Logged out successfully");
    navigate("/");
  };

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass-card rounded-2xl px-6 py-4 mb-5 flex items-center justify-between"
    >
      <div className="flex items-center gap-3">
        <motion.div
          whileHover={{ rotate: 15 }}
          className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center"
        >
          <Zap className="w-6 h-6 text-primary-foreground" />
        </motion.div>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">
            <span className="text-primary">LACTRON</span>
          </h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
            Neural Milk Analysis
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={onToggleTheme}
          className="rounded-xl w-10 h-10"
        >
          <motion.div
            key={isDark ? "dark" : "light"}
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </motion.div>
        </Button>
        <Button
          variant="outline"
          onClick={handleLogout}
          className="rounded-xl h-10 text-status-danger border-status-danger/20 hover:bg-status-danger/10"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </motion.nav>
  );
};

export default DashboardNav;
