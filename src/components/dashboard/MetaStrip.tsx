import { motion } from "framer-motion";
import { Hash, MapPin, Clock, User } from "lucide-react";
import { format } from "date-fns";
import { Batch } from "@/lib/api";

interface MetaStripProps {
  batch: Batch | null;
}

const MetaStrip = ({ batch }: MetaStripProps) => {
  const formatCollectionTime = (datetime: string) => {
    try {
      return format(new Date(datetime), "MMM dd, yyyy 'at' HH:mm");
    } catch {
      return datetime;
    }
  };

  const metaItems = batch ? [
    { icon: Hash, label: "Batch Identifier", value: batch.batch_id },
    { icon: User, label: "Collector", value: batch.collector_name },
    { icon: Clock, label: "Time of Collection", value: formatCollectionTime(batch.collection_datetime) },
  ] : [
    { icon: Hash, label: "Batch Identifier", value: "No batch selected" },
    { icon: User, label: "Collector", value: "-" },
    { icon: Clock, label: "Time of Collection", value: "-" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="glass-card rounded-2xl px-6 py-3 mb-5 flex flex-wrap gap-6"
    >
      {metaItems.map((item, index) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 * (index + 1) }}
          className="flex items-center gap-2"
        >
          <item.icon className="w-4 h-4 text-primary" />
          <span className="text-xs text-muted-foreground">{item.label}:</span>
          <span className="text-sm font-semibold font-mono">{item.value}</span>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default MetaStrip;
