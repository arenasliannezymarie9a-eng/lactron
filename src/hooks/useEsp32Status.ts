import { useState, useEffect, useCallback, useRef } from "react";
import { esp32API } from "@/lib/api";

export interface Esp32Status {
  isOnline: boolean;
  isWarmingUp: boolean;
  warmUpRemaining: number; // seconds
}

const useEsp32Status = (): Esp32Status => {
  const [isOnline, setIsOnline] = useState(false);
  const [isWarmingUp, setIsWarmingUp] = useState(false);
  const [warmUpRemaining, setWarmUpRemaining] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pollStatus = useCallback(async () => {
    const res = await esp32API.getStatus();
    if (res.success && res.data) {
      setIsOnline(true);
      
      if (res.data.warming_up) {
        setIsWarmingUp(true);
        const remainingSecs = Math.ceil((res.data.warmup_remaining_ms || 0) / 1000);
        setWarmUpRemaining(remainingSecs);
      } else {
        setIsWarmingUp(false);
        setWarmUpRemaining(0);
      }
    } else {
      setIsOnline(false);
      setIsWarmingUp(false);
      setWarmUpRemaining(0);
    }
  }, []);

  // Poll every 10 seconds
  useEffect(() => {
    pollStatus();
    const interval = setInterval(pollStatus, 10000);
    return () => clearInterval(interval);
  }, [pollStatus]);

  // Local countdown timer (ticks every second between polls for smooth UX)
  useEffect(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }

    if (isWarmingUp && warmUpRemaining > 0) {
      countdownRef.current = setInterval(() => {
        setWarmUpRemaining((prev) => {
          if (prev <= 1) {
            setIsWarmingUp(false);
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [isWarmingUp, warmUpRemaining > 0]); // Only restart when warmUp starts

  return { isOnline, isWarmingUp, warmUpRemaining };
};

export default useEsp32Status;
