import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, FileText, Clock, User, Hash, Beaker, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { historyAPI, BatchHistory } from "@/lib/api";
import { format } from "date-fns";

interface BatchHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BatchHistoryModal = ({ isOpen, onClose }: BatchHistoryModalProps) => {
  const [history, setHistory] = useState<BatchHistory[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<BatchHistory[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<BatchHistory | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredHistory(history);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredHistory(
        history.filter(
          (h) =>
            h.batch_id.toLowerCase().includes(query) ||
            h.collector_name.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, history]);

  const loadHistory = async () => {
    setIsLoading(true);
    const response = await historyAPI.getAll();
    if (response.success && response.data) {
      setHistory(response.data);
      setFilteredHistory(response.data);
    }
    setIsLoading(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDateTime = (datetime: string) => {
    try {
      return format(new Date(datetime), "MMM dd, yyyy 'at' HH:mm");
    } catch {
      return datetime;
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="glass-card rounded-3xl p-6 w-full max-w-4xl max-h-[85vh] shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Batch History
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by batch ID or collector..."
            className="pl-10 h-11 rounded-xl bg-secondary/50 border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* History List or Detail View */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {selectedBatch ? (
              <BatchDetailView
                batch={selectedBatch}
                onBack={() => setSelectedBatch(null)}
                onPrint={handlePrint}
              />
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full overflow-y-auto pr-2 space-y-3"
              >
                {isLoading ? (
                  <div className="text-center py-10 text-muted-foreground">
                    Loading history...
                  </div>
                ) : filteredHistory.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    {searchQuery ? "No matching records found" : "No saved batches yet"}
                  </div>
                ) : (
                  filteredHistory.map((item) => (
                    <motion.button
                      key={item.id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setSelectedBatch(item)}
                      className="w-full text-left p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 border border-border/30 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono font-semibold text-primary">
                          {item.batch_id}
                        </span>
                        <span
                          className={`text-xs font-bold px-2 py-1 rounded-full ${
                            item.grade === "GOOD"
                              ? "bg-status-good/20 text-status-good"
                              : "bg-status-danger/20 text-status-danger"
                          }`}
                        >
                          {item.grade}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {item.collector_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDateTime(item.collection_datetime)}
                        </span>
                      </div>
                    </motion.button>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};

interface BatchDetailViewProps {
  batch: BatchHistory;
  onBack: () => void;
  onPrint: () => void;
}

const BatchDetailView = ({ batch, onBack, onPrint }: BatchDetailViewProps) => {
  const formatDateTime = (datetime: string) => {
    try {
      return format(new Date(datetime), "MMM dd, yyyy 'at' HH:mm");
    } catch {
      return datetime;
    }
  };

  return (
    <motion.div
      key="detail"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="h-full overflow-y-auto pr-2"
    >
      {/* Back button */}
      <Button
        variant="ghost"
        onClick={onBack}
        className="mb-4 -ml-2 text-sm"
      >
        ← Back to list
      </Button>

      {/* Batch Info Card */}
      <div className="print:block p-5 rounded-xl bg-secondary/30 border border-border/30 mb-4">
        <h3 className="font-bold text-lg mb-4 text-primary">Batch Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Batch ID:</span>
            <span className="font-mono font-semibold">{batch.batch_id}</span>
          </div>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Collector:</span>
            <span className="font-semibold">{batch.collector_name}</span>
          </div>
          <div className="flex items-center gap-2 md:col-span-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Time of Collection:</span>
            <span className="font-semibold">{formatDateTime(batch.collection_datetime)}</span>
          </div>
        </div>
      </div>

      {/* Molecular Fingerprint */}
      <div className="p-5 rounded-xl bg-secondary/30 border border-border/30 mb-4">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Beaker className="w-5 h-5 text-primary" />
          Molecular Fingerprint
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-background/50">
            <div className="text-xs text-muted-foreground uppercase mb-1">Ethanol</div>
            <div className="text-xl font-bold text-primary font-mono">{batch.ethanol} <span className="text-xs text-muted-foreground">ppm</span></div>
          </div>
          <div className="text-center p-3 rounded-lg bg-background/50">
            <div className="text-xs text-muted-foreground uppercase mb-1">Ammonia</div>
            <div className="text-xl font-bold text-primary font-mono">{batch.ammonia} <span className="text-xs text-muted-foreground">ppm</span></div>
          </div>
          <div className="text-center p-3 rounded-lg bg-background/50">
            <div className="text-xs text-muted-foreground uppercase mb-1">H₂S</div>
            <div className="text-xl font-bold text-primary font-mono">{batch.h2s} <span className="text-xs text-muted-foreground">ppm</span></div>
          </div>
        </div>
      </div>

      {/* Grade and Shelf Life */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="p-5 rounded-xl bg-secondary/30 border border-border/30 text-center">
          <div className="text-xs text-muted-foreground uppercase mb-2">Grade</div>
          <div
            className={`text-2xl font-extrabold ${
              batch.grade === "GOOD" ? "text-status-good" : "text-status-danger"
            }`}
          >
            {batch.grade}
          </div>
        </div>
        <div className="p-5 rounded-xl bg-secondary/30 border border-border/30 text-center">
          <div className="text-xs text-muted-foreground uppercase mb-2 flex items-center justify-center gap-1">
            <Timer className="w-3 h-3" />
            Shelf Life
          </div>
          <div className="text-2xl font-extrabold text-primary font-mono">
            {batch.shelf_life} <span className="text-sm text-muted-foreground">Days</span>
          </div>
        </div>
      </div>

      {/* Saved timestamp */}
      <div className="text-center text-xs text-muted-foreground mb-4">
        Saved on {formatDateTime(batch.saved_at)}
      </div>

      {/* Print Button */}
      <div className="flex justify-center print:hidden">
        <Button onClick={onPrint} className="rounded-xl">
          <FileText className="w-4 h-4 mr-2" />
          Print to PDF
        </Button>
      </div>
    </motion.div>
  );
};

export default BatchHistoryModal;
