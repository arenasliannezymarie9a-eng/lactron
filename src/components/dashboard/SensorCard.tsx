import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface SensorCardProps {
  label: string;
  value: number;
  unit: string;
  maxValue: number;
  icon: LucideIcon;
  color: "primary" | "accent" | "success";
  delay?: number;
}

const colorMap = {
  primary: {
    bar: "bg-primary",
    text: "text-primary",
    glow: "shadow-primary/30",
  },
  accent: {
    bar: "bg-accent",
    text: "text-accent",
    glow: "shadow-accent/30",
  },
  success: {
    bar: "bg-status-good",
    text: "text-status-good",
    glow: "shadow-status-good/30",
  },
};

const SensorCard = ({ label, value, unit, maxValue, icon: Icon, color, delay = 0 }: SensorCardProps) => {
  const percentage = Math.min((value / maxValue) * 100, 100);
  const colors = colorMap[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="group"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg bg-secondary flex items-center justify-center ${colors.text} transition-all group-hover:scale-110`}>
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-sm font-semibold">{label}</span>
        </div>
        <motion.span
          key={value}
          initial={{ scale: 1.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`font-mono text-sm font-bold ${colors.text}`}
        >
          {value.toFixed(1)} <span className="text-muted-foreground font-normal">{unit}</span>
        </motion.span>
      </div>

      <div className="h-2 bg-secondary/50 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, delay: delay + 0.2, ease: "easeOut" }}
          className={`h-full rounded-full ${colors.bar} shadow-lg ${colors.glow}`}
        />
      </div>
    </motion.div>
  );
};

export default SensorCard;
