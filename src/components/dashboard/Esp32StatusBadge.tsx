import { motion } from "framer-motion";
import { Wifi, WifiOff } from "lucide-react";

interface Esp32StatusBadgeProps {
  isOnline: boolean;
  compact?: boolean;
}

const Esp32StatusBadge = ({ isOnline, compact = false }: Esp32StatusBadgeProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
        isOnline
          ? "border-[hsl(var(--status-good))]/30 bg-[hsl(var(--status-good))]/10 text-[hsl(var(--status-good))]"
          : "border-destructive/30 bg-destructive/10 text-destructive"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isOnline ? "bg-[hsl(var(--status-good))] animate-pulse" : "bg-destructive"
        }`}
      />
      {isOnline ? (
        <>
          {!compact && <Wifi className="w-3 h-3" />}
          <span>{compact ? "Online" : "ESP32 Online"}</span>
        </>
      ) : (
        <>
          {!compact && <WifiOff className="w-3 h-3" />}
          <span>{compact ? "Offline" : "ESP32 Offline"}</span>
        </>
      )}
    </motion.div>
  );
};

export default Esp32StatusBadge;
