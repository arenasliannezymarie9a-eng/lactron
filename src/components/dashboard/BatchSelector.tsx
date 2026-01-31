import { motion } from "framer-motion";
import { Hash, User, Clock, Plus, Save, History, X } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Batch } from "@/lib/api";

interface BatchSelectorProps {
  batches: Batch[];
  currentBatch: Batch | null;
  onSelectBatch: (batch: Batch) => void;
  onCreateNew: () => void;
  onSaveBatch: () => void;
  onViewHistory: () => void;
  onCloseBatch: () => void;
  isSaving: boolean;
}

const BatchSelector = ({
  batches,
  currentBatch,
  onSelectBatch,
  onCreateNew,
  onSaveBatch,
  onViewHistory,
  onCloseBatch,
  isSaving,
}: BatchSelectorProps) => {
  const formatCollectionTime = (datetime: string) => {
    try {
      return format(new Date(datetime), "MMM dd, yyyy 'at' HH:mm");
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

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="glass-card rounded-2xl px-4 py-3 mb-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Batch Selector */}
        <div className="flex items-center gap-4 flex-wrap">
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
            {batches.length > 0 && (
              <span className="text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded-full">
                {batches.length} batch{batches.length !== 1 ? "es" : ""}
              </span>
            )}
          </div>

          {/* Batch Info */}
          {currentBatch && (
            <>
              <div className="hidden sm:flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Collector:</span>
                <span className="font-medium">{currentBatch.collector_name}</span>
              </div>
              <div className="hidden md:flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Collected:</span>
                <span className="font-medium font-mono text-xs">
                  {formatCollectionTime(currentBatch.collection_datetime)}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 print:hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCloseBatch}
            className="h-9 rounded-xl gap-2"
            title="Close batch and return to welcome screen"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Close</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onCreateNew}
            className="h-9 rounded-xl gap-2"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New</span>
          </Button>
          
          {currentBatch && (
            <Button
              variant="default"
              size="sm"
              onClick={onSaveBatch}
              disabled={isSaving}
              className="h-9 rounded-xl gap-2"
            >
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">
                {isSaving ? "Saving..." : "Save"}
              </span>
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewHistory}
            className="h-9 rounded-xl gap-2"
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">History</span>
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default BatchSelector;
