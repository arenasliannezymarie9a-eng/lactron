import { motion } from "framer-motion";
import { Plus, ChevronDown, Beaker, Activity, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Batch } from "@/lib/api";
import lactronLogo from "@/assets/lactron-logo.png";

interface WelcomeStateProps {
  onCreateBatch: () => void;
  onSelectBatch: (batch: Batch) => void;
  batches: Batch[];
}

const WelcomeState = ({ onCreateBatch, onSelectBatch, batches }: WelcomeStateProps) => {
  const handleBatchChange = (batchId: string) => {
    const batch = batches.find((b) => b.batch_id === batchId);
    if (batch) {
      onSelectBatch(batch);
    }
  };

  const features = [
    {
      icon: Beaker,
      title: "Molecular Analysis",
      description: "Real-time sensor readings for ethanol, ammonia, and H₂S",
    },
    {
      icon: Activity,
      title: "Quality Prediction",
      description: "AI-driven spoilage detection and quality grading",
    },
    {
      icon: Clock,
      title: "Shelf Life Forecast",
      description: "Accurate predictions using machine learning",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center min-h-[60vh] py-12"
    >
      {/* Logo and Title */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="text-center mb-8"
      >
        <img
          src={lactronLogo}
          alt="LACTRON"
          className="w-20 h-20 mx-auto mb-4 drop-shadow-lg"
        />
        <h1 className="text-3xl font-bold mb-2">
          Welcome to <span className="text-primary">LACTRON</span>
        </h1>
        <p className="text-muted-foreground max-w-md">
          Intelligence in Every Drop — Start by creating or selecting a batch to begin milk quality analysis.
        </p>
      </motion.div>

      {/* Action Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="glass-card rounded-3xl p-8 w-full max-w-lg"
      >
        <h2 className="text-lg font-semibold mb-6 text-center">Get Started</h2>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={onCreateBatch}
            className="h-12 px-6 rounded-xl gap-2 flex-1"
          >
            <Plus className="w-5 h-5" />
            Create New Batch
          </Button>

          {batches.length > 0 && (
            <Select onValueChange={handleBatchChange}>
              <SelectTrigger className="h-12 px-6 rounded-xl flex-1 bg-secondary/50 border-border/50">
                <SelectValue placeholder="Select Existing Batch" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border rounded-xl">
                {batches.map((batch) => (
                  <SelectItem
                    key={batch.batch_id}
                    value={batch.batch_id}
                    className="rounded-lg"
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{batch.batch_id}</span>
                      <span className="text-xs text-muted-foreground">
                        by {batch.collector_name}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {batches.length === 0 && (
          <p className="text-sm text-muted-foreground text-center mt-4">
            No existing batches found. Create your first batch to start monitoring.
          </p>
        )}
      </motion.div>

      {/* Feature Cards */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 w-full max-w-3xl"
      >
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + index * 0.1, duration: 0.3 }}
            className="glass-card rounded-2xl p-5 text-center"
          >
            <feature.icon className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="font-semibold text-sm mb-1">{feature.title}</h3>
            <p className="text-xs text-muted-foreground">{feature.description}</p>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
};

export default WelcomeState;
