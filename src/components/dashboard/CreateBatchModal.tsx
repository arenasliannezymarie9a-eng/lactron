import { useState } from "react";
import { motion } from "framer-motion";
import { X, Plus, Calendar, User, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { batchAPI } from "@/lib/api";

interface CreateBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBatchCreated: (selectNew?: boolean) => void;
}

const CreateBatchModal = ({ isOpen, onClose, onBatchCreated }: CreateBatchModalProps) => {
  const [batchId, setBatchId] = useState("");
  const [collectorName, setCollectorName] = useState("");
  const [collectionDate, setCollectionDate] = useState("");
  const [collectionTime, setCollectionTime] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!batchId || !collectorName || !collectionDate || !collectionTime) {
      toast.error("All fields are required");
      return;
    }

    setIsLoading(true);
    
    const collectionDatetime = `${collectionDate} ${collectionTime}:00`;
    
    const response = await batchAPI.create(batchId, collectorName, collectionDatetime);
    
    if (response.success) {
      toast.success("Batch created successfully!");
      setBatchId("");
      setCollectorName("");
      setCollectionDate("");
      setCollectionTime("");
      onBatchCreated(true); // Signal to select the new batch
      onClose();
    } else {
      toast.error(response.error || "Failed to create batch");
    }
    
    setIsLoading(false);
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
        className="glass-card rounded-3xl p-6 w-full max-w-md shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Create New Batch</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="batch-id" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Batch Identifier
            </Label>
            <div className="relative mt-1.5">
              <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="batch-id"
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                placeholder="e.g., LAC-2025-001"
                required
                className="pl-10 h-12 rounded-xl bg-secondary/50 border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="collector-name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Name of Collector
            </Label>
            <div className="relative mt-1.5">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="collector-name"
                value={collectorName}
                onChange={(e) => setCollectorName(e.target.value)}
                placeholder="e.g., John Smith"
                required
                className="pl-10 h-12 rounded-xl bg-secondary/50 border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="collection-date" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Collection Date
              </Label>
              <div className="relative mt-1.5">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="collection-date"
                  type="date"
                  value={collectionDate}
                  onChange={(e) => setCollectionDate(e.target.value)}
                  required
                  className="pl-10 h-12 rounded-xl bg-secondary/50 border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="collection-time" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Collection Time
              </Label>
              <Input
                id="collection-time"
                type="time"
                value={collectionTime}
                onChange={(e) => setCollectionTime(e.target.value)}
                required
                className="mt-1.5 h-12 rounded-xl bg-secondary/50 border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 h-12 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 h-12 rounded-xl"
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Plus className="w-5 h-5" />
                </motion.div>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Batch
                </>
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default CreateBatchModal;
