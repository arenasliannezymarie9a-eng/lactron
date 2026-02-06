import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import MeshBackground from "@/components/ui/MeshBackground";
import DashboardNav from "@/components/dashboard/DashboardNav";
import BatchSelector from "@/components/dashboard/BatchSelector";
import WelcomeState from "@/components/dashboard/WelcomeState";
import StatusHero from "@/components/dashboard/StatusHero";
import MolecularFingerprint from "@/components/dashboard/MolecularFingerprint";
import ShelfLifeCard from "@/components/dashboard/ShelfLifeCard";
import CreateBatchModal from "@/components/dashboard/CreateBatchModal";
import BatchHistoryModal from "@/components/dashboard/BatchHistoryModal";
import { Skeleton } from "@/components/ui/skeleton";
import { authAPI, batchAPI, sensorAPI, historyAPI, esp32API, Batch, SensorReading } from "@/lib/api";

type MilkStatus = "good" | "spoiled";

interface SensorData {
  ethanol: number;
  ammonia: number;
  h2s: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(false);
  const [status, setStatus] = useState<MilkStatus>("good");
const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [shelfLife, setShelfLife] = useState(4.8);
  const [sensorHistory, setSensorHistory] = useState<SensorReading[]>([]);
  const [currentBatch, setCurrentBatch] = useState<Batch | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isSavingBatch, setIsSavingBatch] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  // Fixed loadBatches without currentBatch dependency
  const loadBatches = useCallback(async (selectLatest = false) => {
    setIsLoading(true);
    const response = await batchAPI.getAll();
    if (response.success && response.data) {
      setBatches(response.data);
      if (selectLatest && response.data.length > 0) {
        setCurrentBatch(response.data[0]);
      }
    }
    setIsLoading(false);
  }, []);

  const loadSensorHistory = useCallback(async () => {
    if (!currentBatch) return;
    const response = await sensorAPI.getHistory(currentBatch.batch_id, 20);
    if (response.success && response.data) {
      setSensorHistory(response.data);
      if (response.data.length > 0) {
        const latest = response.data[0];
        // Explicitly parse numbers from PHP string responses
        setSensorData({
          ethanol: Number(latest.ethanol) || 0,
          ammonia: Number(latest.ammonia) || 0,
          h2s: Number(latest.h2s) || 0,
        });
        setStatus(latest.status as MilkStatus);
        setShelfLife(Number(latest.predicted_shelf_life) || 0);
      } else {
        // No readings yet for this batch
        setSensorData(null);
        setStatus("good");
        setShelfLife(0);
      }
    }
  }, [currentBatch]);

  // Auth check and initial load
  useEffect(() => {
    const checkAuth = async () => {
      const response = await authAPI.checkSession();
      if (!response.success) {
        toast.error("Session expired. Please log in again.");
        navigate('/');
        return;
      }
      setIsAuthChecking(false);
      loadBatches();
    };
    checkAuth();
  }, [navigate, loadBatches]);

  useEffect(() => {
    if (currentBatch && !isSimulating) {
      loadSensorHistory();
      const interval = setInterval(loadSensorHistory, 5000);
      return () => clearInterval(interval);
    }
  }, [currentBatch, loadSensorHistory, isSimulating]);

  const simulateEvent = () => {
    if (isSimulating) {
      // Exit simulation - reload real data
      setIsSimulating(false);
      loadSensorHistory();
  } else {
    // Enter simulation mode with realistic values based on ML model thresholds
    setIsSimulating(true);
    if (status === "good") {
      // Simulate SPOILED milk - values above spoilage thresholds
      // Model thresholds: Ethanol >80, Ammonia >40, H2S >15
      setStatus("spoiled");
      setSensorData({ 
        ethanol: 95,   // Above 80 ppm threshold
        ammonia: 52,   // Above 40 ppm threshold  
        h2s: 22        // Above 15 ppm threshold (within 30 max)
      });
      setShelfLife(0);
    } else {
      // Simulate FRESH milk - values in fresh range
      // Fresh ranges: Ethanol <20, Ammonia <10, H2S <2
      setStatus("good");
      setSensorData({ 
        ethanol: 12,   // Well below 20 ppm fresh_max
        ammonia: 5,    // Well below 10 ppm fresh_max
        h2s: 0.8       // Well below 2 ppm fresh_max
      });
      setShelfLife(6.5);
    }
  }
  };

  const handleSaveBatch = async () => {
    if (!currentBatch) {
      toast.error("No batch to save");
      return;
    }

    setIsSavingBatch(true);
    const grade = status === "good" ? "GOOD" : "SPOILED";
    
    const response = await historyAPI.save(
      currentBatch.batch_id,
      currentBatch.collector_name,
      currentBatch.collection_datetime,
      sensorData.ethanol,
      sensorData.ammonia,
      sensorData.h2s,
      grade,
      shelfLife
    );

    if (response.success) {
      toast.success("Batch saved to history successfully!");
    } else {
      toast.error(response.error || "Failed to save batch");
    }
    setIsSavingBatch(false);
  };

  const handleBatchCreated = async (selectNew: boolean = true) => {
    await loadBatches(selectNew);
  };

  const handleSelectBatch = async (batch: Batch) => {
    setCurrentBatch(batch);
    
    // Push batch to ESP32 (non-blocking, fails gracefully)
    const response = await esp32API.setActiveBatch(batch.batch_id);
    if (response.success) {
      toast.success("ESP32 synced with selected batch");
    }
    // If ESP32 unreachable, it will still sync via polling
  };

  const handleCloseBatch = async () => {
    setCurrentBatch(null);
    
    // Clear batch on ESP32
    await esp32API.clearBatch();
  };

  // Show loading while checking auth
  if (isAuthChecking) {
    return (
      <div className="min-h-screen p-4 md:p-6">
        <MeshBackground />
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-4">
              <Skeleton className="h-20 w-20 rounded-full" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
      </div>
    );
  }

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
          <DashboardNav
            isDark={isDark}
            onToggleTheme={() => setIsDark(!isDark)}
            onViewHistory={() => setIsHistoryModalOpen(true)}
          />

          <AnimatePresence mode="wait">
            {!currentBatch ? (
              <WelcomeState
                key="welcome"
                onCreateBatch={() => setIsModalOpen(true)}
                onSelectBatch={handleSelectBatch}
                batches={batches}
              />
            ) : (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <BatchSelector
                  batches={batches}
                  currentBatch={currentBatch}
                  onSelectBatch={handleSelectBatch}
                  onCreateNew={() => setIsModalOpen(true)}
                  onSaveBatch={handleSaveBatch}
                  onViewHistory={() => setIsHistoryModalOpen(true)}
                  onCloseBatch={handleCloseBatch}
                  isSaving={isSavingBatch}
                />
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="mb-5"
                >
                  <StatusHero status={status} grade={grade} />
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                  <div className="lg:col-span-3">
                    <MolecularFingerprint data={sensorData} history={sensorHistory} />
                  </div>
                  <div className="lg:col-span-2">
                    <ShelfLifeCard
                      days={shelfLife}
                      status={status}
                      batch={currentBatch}
                      onSimulate={simulateEvent}
                      isSimulating={isSimulating}
                    />
                  </div>
                </div>

                <motion.footer
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-center mt-8 text-xs text-muted-foreground"
                >
                  <p className="mb-1">
                    <span className="font-semibold text-primary">LACTRON</span> - Solar-Powered IoT Smart System for Milk Quality Monitoring
                  </p>
                  <p>AI-Driven Spoilage Prediction using TensorFlow Regression Model</p>
                </motion.footer>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <CreateBatchModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onBatchCreated={handleBatchCreated}
      />

      <BatchHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
      />
    </>
  );
};

export default Dashboard;
