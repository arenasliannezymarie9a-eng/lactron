import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Hash, MapPin, Clock } from "lucide-react";

const MetaStrip = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const metaItems = [
    { icon: Hash, label: "Batch Identifier", value: "#LAC-2025-X99" },
    { icon: MapPin, label: "Collection Site", value: "Regional Silo 04" },
    {
      icon: Clock,
      label: "Session Time",
      value: time.toLocaleTimeString(),
    },
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
