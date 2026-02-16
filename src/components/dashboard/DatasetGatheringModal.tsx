import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Database,
  Play,
  Pause,
  Square,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Activity,
  Beaker,
} from "lucide-react";
import { toast } from "sonner";
import { datasetAPI, sensorAPI, esp32API, DatasetSession } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface DatasetGatheringModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DatasetGatheringModal = ({ isOpen, onClose }: DatasetGatheringModalProps) => {
  const [activeSession, setActiveSession] = useState<DatasetSession | null>(null);
  const [pastSessions, setPastSessions] = useState<DatasetSession[]>([]);
  const [initialShelfLife, setInitialShelfLife] = useState(72);
  const [isStarting, setIsStarting] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [latestSensor, setLatestSensor] = useState<{ ethanol: number; ammonia: number; h2s: number } | null>(null);
  const [readingCount, setReadingCount] = useState(0);

  const loadActiveSession = useCallback(async () => {
    const res = await datasetAPI.getActive();
    if (res.success) {
      setActiveSession(res.data || null);
      if (res.data) {
        setReadingCount(Number(res.data.reading_count) || 0);
      }
    }
  }, []);

  const loadPastSessions = useCallback(async () => {
    const res = await datasetAPI.getList();
    if (res.success && res.data) {
      setPastSessions(res.data.filter(s => s.session_state === 'stopped'));
    }
  }, []);

  const loadLatestSensor = useCallback(async () => {
    if (!activeSession || activeSession.session_state !== 'active') return;
    const res = await sensorAPI.getLatest(activeSession.batch_id);
    if (res.success && res.data) {
      setLatestSensor({
        ethanol: Number(res.data.ethanol) || 0,
        ammonia: Number(res.data.ammonia) || 0,
        h2s: Number(res.data.h2s) || 0,
      });
    }
  }, [activeSession]);

  useEffect(() => {
    if (isOpen) {
      loadActiveSession();
      loadPastSessions();
    }
  }, [isOpen, loadActiveSession, loadPastSessions]);

  // Auto-refresh when active
  useEffect(() => {
    if (!activeSession || activeSession.session_state !== 'active') return;
    loadLatestSensor();
    const interval = setInterval(() => {
      loadActiveSession();
      loadLatestSensor();
    }, 5000);
    return () => clearInterval(interval);
  }, [activeSession, loadActiveSession, loadLatestSensor]);

  const handleStart = async () => {
    setIsStarting(true);
    const res = await datasetAPI.start(initialShelfLife);
    if (res.success && res.data) {
      setActiveSession(res.data);
      setReadingCount(0);
      setLatestSensor(null);
      // Sync ESP32 with the dataset batch
      await esp32API.setActiveBatch(res.data.batch_id);
      toast.success(`Dataset gathering started: ${res.data.batch_id}`);
      loadPastSessions();
    } else {
      toast.error(res.error || "Failed to start session");
    }
    setIsStarting(false);
  };

  const handlePause = async () => {
    if (!activeSession) return;
    setIsActionLoading(true);
    const res = await datasetAPI.pause(activeSession.batch_id);
    if (res.success) {
      await esp32API.clearBatch();
      toast.success("Session paused");
      loadActiveSession();
    } else {
      toast.error(res.error || "Failed to pause");
    }
    setIsActionLoading(false);
  };

  const handleResume = async () => {
    if (!activeSession) return;
    setIsActionLoading(true);
    const res = await datasetAPI.resume(activeSession.batch_id);
    if (res.success) {
      await esp32API.setActiveBatch(activeSession.batch_id);
      toast.success("Session resumed");
      loadActiveSession();
    } else {
      toast.error(res.error || "Failed to resume");
    }
    setIsActionLoading(false);
  };

  const handleStop = async () => {
    if (!activeSession) return;
    setIsActionLoading(true);
    const res = await datasetAPI.stop(activeSession.batch_id);
    if (res.success) {
      await esp32API.clearBatch();
      toast.success("Dataset gathering stopped");
      setActiveSession(null);
      setLatestSensor(null);
      loadPastSessions();
    } else {
      toast.error(res.error || "Failed to stop");
    }
    setIsActionLoading(false);
  };

  const handleUpdateGrade = async (grade: 'good' | 'fair' | 'spoiled') => {
    if (!activeSession) return;
    const res = await datasetAPI.updateStatus(activeSession.batch_id, grade);
    if (res.success) {
      setActiveSession(prev => prev ? { ...prev, status_override: grade } : null);
      toast.success(`Grade updated to ${grade.toUpperCase()}`);
    } else {
      toast.error(res.error || "Failed to update grade");
    }
  };

  const formatDuration = (session: DatasetSession) => {
    const start = new Date(session.started_at).getTime();
    const end = session.stopped_at ? new Date(session.stopped_at).getTime() : Date.now();
    const totalSeconds = Math.floor((end - start) / 1000) - (session.total_paused_seconds || 0);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const gradeConfig = {
    good: { label: "GOOD", icon: CheckCircle, bgClass: "bg-[hsl(var(--status-good))]", textClass: "text-[hsl(var(--status-good))]", borderClass: "border-[hsl(var(--status-good))]" },
    fair: { label: "FAIR", icon: AlertTriangle, bgClass: "bg-[hsl(var(--status-warning))]", textClass: "text-[hsl(var(--status-warning))]", borderClass: "border-[hsl(var(--status-warning))]" },
    spoiled: { label: "SPOILED", icon: XCircle, bgClass: "bg-destructive", textClass: "text-destructive", borderClass: "border-destructive" },
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Database className="w-5 h-5 text-primary" />
            Dataset Gathering
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {!activeSession ? (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-5"
            >
              {/* Info */}
              <div className="rounded-xl bg-secondary/50 border border-border/50 p-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Collect raw sensor data from the ESP32 and manually annotate with ground-truth grade status. 
                  No ML predictions are used — this creates training data for future model improvement.
                </p>
              </div>

              {/* Shelf Life Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Initial Shelf Life (hours)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={72}
                    value={initialShelfLife}
                    onChange={(e) => setInitialShelfLife(Math.max(1, Math.min(72, Number(e.target.value))))}
                    className="w-24 rounded-lg bg-secondary border border-border px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <span className="text-xs text-muted-foreground">Max 72 hours</span>
                </div>
              </div>

              {/* Start Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleStart}
                disabled={isStarting}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-3 font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                {isStarting ? "Starting..." : "Start Gathering"}
              </motion.button>

              {/* Past Sessions */}
              {pastSessions.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Past Sessions</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {pastSessions.map((s) => (
                      <div key={s.id} className="rounded-lg bg-secondary/50 border border-border/50 p-3 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-mono text-foreground">{s.batch_id}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(s.started_at).toLocaleDateString()} · {formatDuration(s)} · {Number(s.reading_count) || 0} readings
                          </p>
                        </div>
                        <Badge variant="outline" className={`text-[10px] ${gradeConfig[s.status_override].textClass} ${gradeConfig[s.status_override].borderClass}`}>
                          {gradeConfig[s.status_override].label}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="active"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Status Bar */}
              <div className="rounded-xl bg-secondary/50 border border-border/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-muted-foreground">{activeSession.batch_id}</span>
                  <Badge
                    variant="outline"
                    className={activeSession.session_state === 'active' 
                      ? "text-[hsl(var(--status-good))] border-[hsl(var(--status-good))] text-[10px]" 
                      : "text-[hsl(var(--status-warning))] border-[hsl(var(--status-warning))] text-[10px]"}
                  >
                    {activeSession.session_state === 'active' ? '● ACTIVE' : '❚❚ PAUSED'}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Elapsed</p>
                    <p className="text-sm font-mono font-semibold text-foreground">{formatDuration(activeSession)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Remaining</p>
                    <p className="text-sm font-mono font-semibold text-primary">
                      {Number(activeSession.remaining_shelf_life || 0).toFixed(1)}h
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Readings</p>
                    <p className="text-sm font-mono font-semibold text-foreground">{readingCount}</p>
                  </div>
                </div>
              </div>

              {/* Grade Toggle */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ground Truth Grade</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['good', 'fair', 'spoiled'] as const).map((grade) => {
                    const config = gradeConfig[grade];
                    const isSelected = activeSession.status_override === grade;
                    const Icon = config.icon;
                    return (
                      <motion.button
                        key={grade}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleUpdateGrade(grade)}
                        className={`flex flex-col items-center gap-1.5 rounded-xl py-3 px-2 border-2 transition-all text-sm font-semibold ${
                          isSelected
                            ? `${config.bgClass} text-primary-foreground border-transparent shadow-lg`
                            : `bg-secondary/50 ${config.textClass} ${config.borderClass} border-opacity-30`
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        {config.label}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Live Sensor Readings */}
              {latestSensor && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Activity className="w-3 h-3" /> Live Readings
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Ethanol", value: latestSensor.ethanol, unit: "ppm" },
                      { label: "Ammonia", value: latestSensor.ammonia, unit: "ppm" },
                      { label: "H₂S", value: latestSensor.h2s, unit: "ppm" },
                    ].map((s) => (
                      <div key={s.label} className="rounded-lg bg-secondary/50 border border-border/50 p-3 text-center">
                        <p className="text-[10px] text-muted-foreground">{s.label}</p>
                        <p className="text-sm font-mono font-bold text-foreground">{s.value.toFixed(1)}</p>
                        <p className="text-[9px] text-muted-foreground">{s.unit}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                {activeSession.session_state === 'active' ? (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handlePause}
                    disabled={isActionLoading}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[hsl(var(--status-warning))] text-primary-foreground py-2.5 font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    <Pause className="w-4 h-4" />
                    Pause
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleResume}
                    disabled={isActionLoading}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[hsl(var(--status-good))] text-primary-foreground py-2.5 font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    <Play className="w-4 h-4" />
                    Resume
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleStop}
                  disabled={isActionLoading}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-destructive text-destructive-foreground py-2.5 font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <Square className="w-4 h-4" />
                  Stop
                </motion.button>
              </div>

              {/* Past Sessions */}
              {pastSessions.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border/50">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Past Sessions</h3>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {pastSessions.map((s) => (
                      <div key={s.id} className="rounded-lg bg-secondary/50 border border-border/50 p-2.5 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-mono text-foreground">{s.batch_id}</p>
                          <p className="text-[9px] text-muted-foreground">
                            {new Date(s.started_at).toLocaleDateString()} · {Number(s.reading_count) || 0} readings
                          </p>
                        </div>
                        <Badge variant="outline" className={`text-[9px] ${gradeConfig[s.status_override].textClass} ${gradeConfig[s.status_override].borderClass}`}>
                          {gradeConfig[s.status_override].label}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default DatasetGatheringModal;
