import { useState, useEffect, useCallback, useRef } from "react";
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
import DatasetGatheringModal from "@/components/dashboard/DatasetGatheringModal";
import WarmUpOverlay from "@/components/dashboard/WarmUpOverlay";
import { Skeleton } from "@/components/ui/skeleton";
import useEsp32Status from "@/hooks/useEsp32Status";
import { authAPI, batchAPI, sensorAPI, historyAPI, esp32API, Batch, SensorReading } from "@/lib/api";
import { generateReport } from "@/lib/generateReport";

type MilkStatus = "good" | "spoiled";

const MAX_READINGS = 30;

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
  const [isDatasetModalOpen, setIsDatasetModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  
  const [warmUpEnabled, setWarmUpEnabled] = useState(() => {
    return localStorage.getItem('lactron_warmup_enabled') !== 'false';
  });

  const esp32Status = useEsp32Status();
  const hasData = sensorData !== null;
  const readingCount = sensorHistory.length;
  const isComplete = readingCount >= MAX_READINGS;
  const autoSavedRef = useRef(false);

  const toggleWarmUp = () => {
    setWarmUpEnabled(prev => {
      const next = !prev;
      localStorage.setItem('lactron_warmup_enabled', String(next));
      return next;
    });
  };

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

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
    const response = await sensorAPI.getHistory(currentBatch.batch_id, MAX_READINGS);
    if (response.success && response.data) {
      setSensorHistory(response.data);
      if (response.data.length > 0) {
        const latest = response.data[0];
        setSensorData({
          ethanol: Number(latest.ethanol) || 0,
          ammonia: Number(latest.ammonia) || 0,
          h2s: Number(latest.h2s) || 0,
        });
        setStatus(latest.status as MilkStatus);
        setShelfLife(Number(latest.predicted_shelf_life) || 0);
      } else {
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

  // Polling - stops when 30 readings reached
  useEffect(() => {
    if (currentBatch && !isComplete) {
      loadSensorHistory();
      const interval = setInterval(loadSensorHistory, 5000);
      return () => clearInterval(interval);
    }
  }, [currentBatch, loadSensorHistory, isComplete]);

  // Reset auto-save flag when batch changes
  useEffect(() => {
    autoSavedRef.current = false;
  }, [currentBatch?.batch_id]);

  // Auto-save when 30 readings complete
  useEffect(() => {
    if (isComplete && currentBatch && sensorData && !autoSavedRef.current) {
      autoSavedRef.current = true;
      const grade = status === "good" ? "GOOD" : "SPOILED";
      historyAPI.save(
        currentBatch.batch_id,
        currentBatch.collector_name,
        currentBatch.collection_datetime,
        sensorData.ethanol,
        sensorData.ammonia,
        sensorData.h2s,
        grade,
        shelfLife
      ).then(response => {
        if (response.success) {
          toast.success("Analysis complete! Batch auto-saved to history.");
        }
      });
    }
  }, [isComplete, currentBatch, sensorData, status, shelfLife]);

  const handleGenerateReport = () => {
    if (!currentBatch) return;
    const grade = status === "good" ? "GOOD" : "SPOILED";
    generateReport(currentBatch, sensorHistory, grade, shelfLife);
  };

  const handleBatchCreated = async (selectNew: boolean = true) => {
    await loadBatches(selectNew);
  };

  const handleSelectBatch = async (batch: Batch) => {
    setSensorData(null);
    setSensorHistory([]);
    setStatus("good");
    setShelfLife(0);
    setCurrentBatch(batch);
    const response = await esp32API.setActiveBatch(batch.batch_id);
    if (response.success) {
      toast.success("ESP32 synced with selected batch");
    }
  };

  const handleCloseBatch = async () => {
    setCurrentBatch(null);
    await esp32API.clearBatch();
  };


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

  const grade = hasData ? (status === "good" ? "GRADE: GOOD" : "GRADE: SPOILED") : "--";

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
            onOpenDatasetGathering={() => setIsDatasetModalOpen(true)}
            warmUpEnabled={warmUpEnabled}
            onToggleWarmUp={toggleWarmUp}
          />

          <AnimatePresence mode="wait">
            {!currentBatch ? (
              <WelcomeState
                key="welcome"
                onCreateBatch={() => setIsModalOpen(true)}
                onSelectBatch={handleSelectBatch}
                batches={batches}
                esp32Status={esp32Status}
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
                  onViewHistory={() => setIsHistoryModalOpen(true)}
                  onCloseBatch={handleCloseBatch}
                  onGenerateReport={handleGenerateReport}
                  readingCount={readingCount}
                  maxReadings={MAX_READINGS}
                  isComplete={isComplete}
                  esp32Status={esp32Status}
                />
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="mb-5"
                >
                  <StatusHero status={status} grade={grade} hasData={hasData} />
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                  <div className="lg:col-span-3">
                    <MolecularFingerprint
                      data={sensorData}
                      history={sensorHistory}
                      readingCount={readingCount}
                      maxReadings={MAX_READINGS}
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <ShelfLifeCard
                      hours={shelfLife}
                      status={status}
                      batch={currentBatch}
                      onGenerateReport={handleGenerateReport}
                      isComplete={isComplete}
                      hasData={hasData}
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
                  <p>AI-Driven Spoilage Prediction using Scikit-learn Regression Model</p>
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

      <DatasetGatheringModal
        isOpen={isDatasetModalOpen}
        onClose={() => setIsDatasetModalOpen(false)}
      />

      <WarmUpOverlay
        isOpen={warmUpEnabled && esp32Status.isWarmingUp}
        remaining={esp32Status.warmUpRemaining}
      />
    </>
  );
};

export default Dashboard;
