import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import MeshBackground from "@/components/ui/MeshBackground";
import DashboardNav from "@/components/dashboard/DashboardNav";
import MetaStrip from "@/components/dashboard/MetaStrip";
import StatusHero from "@/components/dashboard/StatusHero";
import MolecularFingerprint from "@/components/dashboard/MolecularFingerprint";
import ShelfLifeCard from "@/components/dashboard/ShelfLifeCard";

type MilkStatus = "good" | "spoiled";

interface SensorData {
  ethanol: number;
  ammonia: number;
  h2s: number;
}

const Dashboard = () => {
  const [isDark, setIsDark] = useState(false);
  const [status, setStatus] = useState<MilkStatus>("good");
  const [sensorData, setSensorData] = useState<SensorData>({
    ethanol: 15,
    ammonia: 10,
    h2s: 5,
  });
  const [shelfLife, setShelfLife] = useState(4.8);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  const simulateEvent = () => {
    if (status === "good") {
      setStatus("spoiled");
      setSensorData({ ethanol: 85, ammonia: 70, h2s: 95 });
      setShelfLife(0.2);
    } else {
      setStatus("good");
      setSensorData({ ethanol: 15, ammonia: 10, h2s: 5 });
      setShelfLife(4.8);
    }
  };

  const grade = status === "good" ? "GRADE: GOOD" : "GRADE: SPOILED";

  return (
    <>
      <Helmet>
        <title>Dashboard | LACTRON Milk Quality Monitoring</title>
        <meta 
          name="description" 
          content="Real-time milk quality monitoring dashboard. View sensor data, molecular fingerprint analysis, and AI-predicted shelf life." 
        />
      </Helmet>
      <div className="min-h-screen p-4 md:p-6">
        <MeshBackground />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-6xl mx-auto"
        >
          <DashboardNav isDark={isDark} onToggleTheme={() => setIsDark(!isDark)} />
          <MetaStrip />
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-5"
          >
            <StatusHero status={status} grade={grade} />
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <div className="lg:col-span-3">
              <MolecularFingerprint data={sensorData} />
            </div>
            <div className="lg:col-span-2">
              <ShelfLifeCard
                days={shelfLife}
                status={status}
                onSimulate={simulateEvent}
              />
            </div>
          </div>

          {/* Footer */}
          <motion.footer
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center mt-8 text-xs text-muted-foreground"
          >
            <p className="mb-1">
              <span className="font-semibold text-primary">LACTRON</span> - Solar-Powered IoT Smart System for Milk Quality Monitoring
            </p>
            <p>AI-Driven Spoilage Prediction using TensorFlow Regression Model</p>
          </motion.footer>
        </motion.div>
      </div>
    </>
  );
};

export default Dashboard;
