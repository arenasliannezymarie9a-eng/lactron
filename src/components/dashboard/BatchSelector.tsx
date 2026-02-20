import { motion } from "framer-motion";
import { Hash, User, Clock, Plus, History, X, FileText, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import Esp32StatusBadge from "./Esp32StatusBadge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Batch } from "@/lib/api";

interface BatchSelectorProps {
  batches: Batch[];
  currentBatch: Batch | null;
  onSelectBatch: (batch: Batch) => void;
  onCreateNew: () => void;
  onViewHistory: () => void;
  onCloseBatch: () => void;
  onGenerateReport: () => void;
  readingCount: number;
  maxReadings: number;
  isComplete: boolean;
  esp32Status?: { isOnline: boolean };
}

const BatchSelector = ({
  batches,
  currentBatch,
  onSelectBatch,
  onCreateNew,
  onViewHistory,
  onCloseBatch,
  onGenerateReport,
  readingCount,
  maxReadings,
  isComplete,
  esp32Status,
}: BatchSelectorProps) => {
  const formatCollectionTime = (datetime: string) => {
    try {
      return format(new Date(datetime), "MMM dd, yyyy");
    } catch {
      return datetime;
    }
  };

  const handleBatchChange = (batchId: string) => {
    const batch = batches.find((b) => b.batch_id === batchId);
    if (batch) {
      onSelectBatch(batch);
    }
  };

  const progressPercent = (readingCount / maxReadings) * 100;

  return (
    <TooltipProvider delayDuration={300}>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="glass-card rounded-2xl mb-5 overflow-hidden"
      >
        {/* Row 1: Batch Identity & Actions */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/30">
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-primary" />
            <Select
              value={currentBatch?.batch_id || ""}
              onValueChange={handleBatchChange}
            >
              <SelectTrigger className="w-[180px] h-9 bg-secondary/50 border-border/50 rounded-xl">
                <SelectValue placeholder="Select batch" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border rounded-xl">
                {batches.map((batch) => (
                  <SelectItem
                    key={batch.batch_id}
                    value={batch.batch_id}
                    className="rounded-lg"
                  >
                    {batch.batch_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1 print:hidden">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={onCreateNew} className="h-9 w-9 rounded-xl">
                  <Plus className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New Batch</TooltipContent>
            </Tooltip>

            {isComplete && currentBatch && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="default" size="icon" onClick={onGenerateReport} className="h-9 w-9 rounded-xl">
                    <FileText className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Generate Report</TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onViewHistory} className="h-9 w-9 rounded-xl">
                  <History className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Batch History</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onCloseBatch} className="h-9 w-9 rounded-xl">
                  <X className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Close Batch</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Row 2: Collection Progress — the hero */}
        {currentBatch && (
          <div className="px-4 py-4">
            {isComplete ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col gap-3"
              >
                <div className="flex items-center gap-2">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.1 }}
                  >
                    <CheckCircle2 className="w-5 h-5 text-status-good" />
                  </motion.div>
                  <span className="font-semibold text-status-good text-sm">Analysis Complete</span>
                  <span className="text-muted-foreground text-sm ml-auto font-mono">
                    {readingCount} / {maxReadings} Readings
                  </span>
                </div>
                <div className="relative">
                  <Progress value={100} className="h-3 rounded-full" />
                  <div className="absolute inset-0 h-3 rounded-full bg-status-good/20 animate-pulse" />
                </div>
              </motion.div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {readingCount} of {maxReadings} Readings Collected
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {Math.round(progressPercent)}%
                  </span>
                </div>
                <Progress value={progressPercent} className="h-3 rounded-full" />
              </div>
            )}
          </div>
        )}

        {/* Row 3: Compact Meta Strip */}
        {currentBatch && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 border-t border-border/30 bg-secondary/20 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              <span>{currentBatch.collector_name}</span>
            </div>
            <span className="hidden sm:inline text-border">|</span>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatCollectionTime(currentBatch.collection_datetime)}</span>
            </div>
            <span className="hidden sm:inline text-border">|</span>
            <Esp32StatusBadge isOnline={esp32Status?.isOnline ?? false} compact />
          </div>
        )}
      </motion.div>
    </TooltipProvider>
  );
};

export default BatchSelector;
