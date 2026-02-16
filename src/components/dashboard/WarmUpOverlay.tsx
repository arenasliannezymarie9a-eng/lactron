import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface WarmUpOverlayProps {
  isOpen: boolean;
  remaining: number; // seconds
}

const WarmUpOverlay = ({ isOpen, remaining }: WarmUpOverlayProps) => {
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const progress = Math.max(0, 1 - remaining / 120); // 0 to 1
  const circumference = 2 * Math.PI * 54; // radius = 54
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <Dialog open={isOpen}>
      <DialogContent className="max-w-sm bg-card border-border [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="text-center text-foreground">
            Sensor Warm-Up in Progress
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-5 py-4">
          {/* Circular countdown */}
          <div className="relative w-32 h-32">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                className="stroke-secondary"
                strokeWidth="6"
              />
              <motion.circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                className="stroke-primary"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                initial={false}
                animate={{ strokeDashoffset }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-mono font-bold text-foreground">
                {minutes}:{seconds.toString().padStart(2, "0")}
              </span>
            </div>
          </div>

          <p className="text-sm text-muted-foreground text-center max-w-xs leading-relaxed">
            The sensors require a 2-minute calibration period before readings are accurate. 
            Please wait for the warm-up to complete.
          </p>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[hsl(var(--status-warning))] animate-pulse" />
            <span className="text-xs font-medium text-[hsl(var(--status-warning))]">Calibrating sensors...</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WarmUpOverlay;
