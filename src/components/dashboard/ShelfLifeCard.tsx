import { motion } from "framer-motion";
import { Clock, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Batch } from "@/lib/api";
import { format } from "date-fns";

interface ShelfLifeCardProps {
  days: number;
  status: "good" | "spoiled";
  batch: Batch | null;
  onSimulate: () => void;
}

const ShelfLifeCard = ({ days, status, batch, onSimulate }: ShelfLifeCardProps) => {
  // Ensure days is a valid number, default to 0 if not
  const safeDays = typeof days === 'number' && !isNaN(days) ? days : 0;
  const isGood = status === "good";

  const tips = isGood
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="glass-card rounded-3xl p-6 flex flex-col h-full"
    >
      {/* Batch Info for PDF */}
      {batch && (
        <div className="hidden print:block mb-4 p-4 border border-border rounded-xl">
          <h4 className="font-bold text-sm mb-2">Batch Information</h4>
          <div className="text-xs space-y-1">
            <p><span className="text-muted-foreground">Batch ID:</span> {batch.batch_id}</p>
            <p><span className="text-muted-foreground">Collector:</span> {batch.collector_name}</p>
            <p><span className="text-muted-foreground">Time of Collection:</span> {format(new Date(batch.collection_datetime), "MMM dd, yyyy 'at' HH:mm")}</p>
          </div>
        </div>
      )}

      <div className="text-center mb-4">
        <div className="inline-flex items-center gap-2 text-muted-foreground mb-2">
          <Clock className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-widest">
            Estimated Shelf Life
          </span>
        </div>

        <motion.div
          key={safeDays}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className={`text-6xl font-extrabold tracking-tighter ${
            isGood ? "text-primary" : "text-status-danger"
          }`}
        >
          {safeDays.toFixed(1)}
          <span className="text-xl text-muted-foreground font-medium ml-2">Days</span>
        </motion.div>
      </div>

      {/* Tips Box */}
      <motion.div
        layout
        className={`flex-1 rounded-2xl p-4 text-sm leading-relaxed ${
          isGood
            ? "bg-status-good/5 border border-status-good/20"
            : "bg-status-danger/5 border border-status-danger/20"
        }`}
      >
        <motion.p
          key={tips.title}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`font-bold mb-2 ${isGood ? "text-status-good" : "text-status-danger"}`}
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
              <span className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${isGood ? "bg-status-good" : "bg-status-danger"}`} />
              {item}
            </motion.li>
          ))}
        </ul>
      </motion.div>

      {/* Action Buttons */}
      <div className="flex gap-3 mt-4 print:hidden">
        <Button
          variant="outline"
          onClick={onSimulate}
          className="flex-1 rounded-xl h-11 hover:scale-[1.02] transition-transform"
        >
          <Activity className="w-4 h-4 mr-2" />
          Simulate Event
        </Button>
        <Button
          className="flex-1 rounded-xl h-11 hover:scale-[1.02] transition-transform"
          onClick={handlePrint}
        >
          PDF Report
        </Button>
      </div>
    </motion.div>
  );
};

export default ShelfLifeCard;
