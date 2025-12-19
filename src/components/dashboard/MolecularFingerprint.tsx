import { motion } from "framer-motion";
import { Beaker, Wind, Flame } from "lucide-react";
import SensorCard from "./SensorCard";

interface SensorData {
  ethanol: number;
  ammonia: number;
  h2s: number;
}

interface MolecularFingerprintProps {
  data: SensorData;
}

const MolecularFingerprint = ({ data }: MolecularFingerprintProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
      className="glass-card rounded-3xl p-6"
    >
      <div className="flex items-center gap-2 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Beaker className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Molecular Fingerprint
          </h3>
          <p className="text-xs text-muted-foreground">
            Real-time gas sensor readings
          </p>
        </div>
      </div>

      <div className="space-y-5">
        <SensorCard
          label="Ethanol"
          value={data.ethanol / 5}
          unit="ppm"
          maxValue={20}
          icon={Beaker}
          color="primary"
          delay={0}
        />
        <SensorCard
          label="Ammonia"
          value={data.ammonia / 10}
          unit="ppm"
          maxValue={10}
          icon={Wind}
          color="accent"
          delay={0.1}
        />
        <SensorCard
          label="H₂S (Hydrogen Sulfide)"
          value={data.h2s / 100}
          unit="ppm"
          maxValue={1}
          icon={Flame}
          color="success"
          delay={0.2}
        />
      </div>
    </motion.div>
  );
};

export default MolecularFingerprint;
