import { motion } from "framer-motion";
import { Beaker, Wind, Flame } from "lucide-react";
import SensorCard from "./SensorCard";
import SensorHistoryChart from "./SensorHistoryChart";
import { SensorReading } from "@/lib/api";

interface SensorData {
  ethanol: number;
  ammonia: number;
  h2s: number;
}

interface MolecularFingerprintProps {
  data: SensorData | null;
  history: SensorReading[];
}

const MolecularFingerprint = ({ data, history }: MolecularFingerprintProps) => {
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

      {data ? (
        <div className="space-y-6">
          {/* Ethanol */}
          <div>
            <SensorCard
              label="Ethanol"
              value={data.ethanol}
              unit="ppm"
              maxValue={100}
              icon={Beaker}
              color="primary"
              delay={0}
            />
            <SensorHistoryChart
              data={history}
              sensorType="ethanol"
              color="hsl(var(--primary))"
              label="Ethanol"
            />
          </div>

          {/* Ammonia */}
          <div>
            <SensorCard
              label="Ammonia"
              value={data.ammonia}
              unit="ppm"
              maxValue={100}
              icon={Wind}
              color="accent"
              delay={0.1}
            />
            <SensorHistoryChart
              data={history}
              sensorType="ammonia"
              color="hsl(var(--accent))"
              label="Ammonia"
            />
          </div>

          {/* H2S */}
          <div>
            <SensorCard
              label="H₂S (Hydrogen Sulfide)"
              value={data.h2s}
              unit="ppm"
              maxValue={50}
              icon={Flame}
              color="success"
              delay={0.2}
            />
            <SensorHistoryChart
              data={history}
              sensorType="h2s"
              color="hsl(var(--status-good))"
              label="H₂S"
            />
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          <p>No sensor readings yet for this batch</p>
        </div>
      )}
    </motion.div>
  );
};

export default MolecularFingerprint;
