import { motion } from "framer-motion";
import lactronLogo from "@/assets/lactron-logo.png";
import ProfileDropdown from "./ProfileDropdown";

interface DashboardNavProps {
  isDark: boolean;
  onToggleTheme: () => void;
  onAddNewBatch: () => void;
  onSaveBatch: () => void;
  onViewHistory: () => void;
  hasBatchToSave: boolean;
}

const DashboardNav = ({
  isDark,
  onToggleTheme,
  onAddNewBatch,
  onSaveBatch,
  onViewHistory,
  hasBatchToSave,
}: DashboardNavProps) => {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass-card rounded-2xl px-6 py-4 mb-5 flex items-center justify-between"
    >
      <div className="flex items-center gap-3">
        <motion.img
          src={lactronLogo}
          alt="LACTRON"
          className="w-10 h-10 object-contain"
          whileHover={{ rotate: 10, scale: 1.05 }}
          transition={{ type: "spring", stiffness: 400 }}
        />
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-primary">
            LACTRON
          </h1>
          <p className="text-[10px] font-bold text-foreground tracking-wide">
            Intelligence in Every Drop.
          </p>
        </div>
      </div>

      {/* Profile Dropdown - Hidden during print */}
      <div className="print:hidden">
        <ProfileDropdown
          isDark={isDark}
          onToggleTheme={onToggleTheme}
          onAddNewBatch={onAddNewBatch}
          onSaveBatch={onSaveBatch}
          onViewHistory={onViewHistory}
          hasBatchToSave={hasBatchToSave}
        />
      </div>
    </motion.nav>
  );
};

export default DashboardNav;
