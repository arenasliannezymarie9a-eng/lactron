import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle } from "lucide-react";

interface StatusHeroProps {
  status: "good" | "spoiled";
  grade: string;
}

const StatusHero = ({ status, grade }: StatusHeroProps) => {
  const isGood = status === "good";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`relative overflow-hidden rounded-3xl p-6 text-center border-2 transition-all duration-500 ${
        isGood
          ? "border-status-good bg-status-good/5 glow-success"
          : "border-status-danger bg-status-danger/5 glow-danger"
      }`}
    >
      {/* Animated background */}
      <motion.div
        className={`absolute inset-0 opacity-10 ${isGood ? "bg-status-good" : "bg-status-danger"}`}
        animate={{
          background: isGood
            ? [
                "radial-gradient(circle at 20% 50%, hsl(var(--status-good)) 0%, transparent 50%)",
                "radial-gradient(circle at 80% 50%, hsl(var(--status-good)) 0%, transparent 50%)",
                "radial-gradient(circle at 20% 50%, hsl(var(--status-good)) 0%, transparent 50%)",
              ]
            : [
                "radial-gradient(circle at 20% 50%, hsl(var(--status-danger)) 0%, transparent 50%)",
                "radial-gradient(circle at 80% 50%, hsl(var(--status-danger)) 0%, transparent 50%)",
                "radial-gradient(circle at 20% 50%, hsl(var(--status-danger)) 0%, transparent 50%)",
              ],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
          className="inline-flex items-center gap-2 mb-2"
        >
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Classification
          </span>
        </motion.div>

        <motion.div
          key={status}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="flex items-center justify-center gap-3"
        >
          {isGood ? (
            <CheckCircle2 className="w-10 h-10 text-status-good" />
          ) : (
            <AlertTriangle className="w-10 h-10 text-status-danger" />
          )}
          <span
            className={`text-4xl md:text-5xl font-extrabold tracking-tight ${
              isGood ? "text-status-good" : "text-status-danger"
            }`}
          >
            {grade}
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default StatusHero;
