import { motion } from "framer-motion";
import { Clock, Activity, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Batch } from "@/lib/api";

interface ShelfLifeCardProps {
  hours: number;
  status: "good" | "spoiled";
  batch: Batch | null;
  onSimulate: () => void;
  onGenerateReport: () => void;
  isSimulating?: boolean;
  isComplete?: boolean;
  hasData?: boolean;
}

const ShelfLifeCard = ({ hours, status, batch, onSimulate, onGenerateReport, isSimulating = false, isComplete = false, hasData = true }: ShelfLifeCardProps) => {
  const safeHours = typeof hours === 'number' && !isNaN(hours) ? hours : 0;
  const isGood = status === "good";

  const tips = isComplete
    ? {
        title: "Analysis Complete",
        items: isGood
          ? [
              "All 30 readings collected successfully.",
              "Batch classified as GOOD — safe for distribution.",
              "Generate the full report for documentation.",
            ]
          : [
              "All 30 readings collected successfully.",
              "Batch classified as SPOILED — quarantine recommended.",
              "Generate the full report for records.",
            ],
      }
    : isGood
      ? {
          title: "Status: Stable",
          items: [
            "Chemical signatures within baseline.",
            "Maintain storage at 4°C.",
            "Batch is safe for cold-chain distribution.",
          ],
        }
      : {
          title: "Warning: Spoilage Detected",
          items: [
            "High ammonia and sulfur markers detected.",
            "Batch quarantine required immediately.",
            "Sanitize all contact sensors and silos.",
          ],
        };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="glass-card rounded-3xl p-6 flex flex-col h-full"
    >
      {/* Simulation Mode Banner */}
      {isSimulating && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center"
        >
          <p className="text-amber-500 font-semibold text-sm flex items-center justify-center gap-2">
            <Activity className="w-4 h-4 animate-pulse" />
            SIMULATION MODE
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Click below to resume real-time data.
          </p>
        </motion.div>
      )}

      {/* Complete Banner */}
      {isComplete && !isSimulating && hasData && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 rounded-xl bg-status-good/10 border border-status-good/30 text-center"
        >
          <p className="text-status-good font-semibold text-sm flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            ANALYSIS COMPLETE
          </p>
        </motion.div>
      )}

      <div className="text-center mb-4">
        <div className="inline-flex items-center gap-2 text-muted-foreground mb-2">
          <Clock className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-widest">
            Estimated Shelf Life
          </span>
        </div>

        <motion.div
          key={hasData ? safeHours : 'placeholder'}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className={`text-6xl font-extrabold tracking-tighter ${
            !hasData ? "text-muted-foreground/40" : isGood ? "text-primary" : "text-status-danger"
          }`}
        >
          {hasData ? safeHours.toFixed(1) : "--"}
          <span className="text-xl text-muted-foreground font-medium ml-2">Hours</span>
        </motion.div>
      </div>

      {/* Tips Box */}
      {hasData ? (
        <motion.div
          layout
          className={`flex-1 rounded-2xl p-4 text-sm leading-relaxed ${
            isComplete
              ? "bg-status-good/5 border border-status-good/20"
              : isGood
                ? "bg-status-good/5 border border-status-good/20"
                : "bg-status-danger/5 border border-status-danger/20"
          }`}
        >
          <motion.p
            key={tips.title}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`font-bold mb-2 ${
              isComplete ? "text-status-good" : isGood ? "text-status-good" : "text-status-danger"
            }`}
          >
            {tips.title}
          </motion.p>
          <ul className="space-y-1.5 text-muted-foreground">
            {tips.items.map((item, i) => (
              <motion.li
                key={item}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-start gap-2"
              >
                <span className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  isComplete ? "bg-status-good" : isGood ? "bg-status-good" : "bg-status-danger"
                }`} />
                {item}
              </motion.li>
            ))}
          </ul>
        </motion.div>
      ) : (
        <div className="flex-1 rounded-2xl p-4 text-sm leading-relaxed bg-secondary/30 border border-border/50 flex items-center justify-center">
          <p className="text-muted-foreground text-center">
            Awaiting first sensor reading...
          </p>
        </div>
      )}

      {/* Action Buttons */}
      {hasData && (
        <div className="flex gap-3 mt-4 print:hidden">
          {isComplete ? (
            <Button
              onClick={onGenerateReport}
              className="flex-1 rounded-xl h-11 hover:scale-[1.02] transition-transform"
            >
              <FileText className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
          ) : (
            <>
              <Button
                variant={isSimulating ? "default" : "outline"}
                onClick={onSimulate}
                className={`flex-1 rounded-xl h-11 hover:scale-[1.02] transition-transform ${
                  isSimulating ? "bg-amber-500 hover:bg-amber-600 text-white" : ""
                }`}
              >
                <Activity className="w-4 h-4 mr-2" />
                {isSimulating ? "Exit Simulation" : "Simulate Event"}
              </Button>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default ShelfLifeCard;
