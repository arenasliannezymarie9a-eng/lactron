import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import lactronLogo from "@/assets/lactron-logo.png";

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [showTagline, setShowTagline] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Show tagline after logo animation completes
    const taglineTimer = setTimeout(() => {
      setShowTagline(true);
    }, 1200);

    // Start exit animation
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, 3000);

    // Complete and unmount
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 3800);

    return () => {
      clearTimeout(taglineTimer);
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
        >
          {/* Logo Animation */}
          <motion.div
            initial={{ scale: 0, opacity: 0, rotate: -180 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{
              duration: 1,
              ease: [0.34, 1.56, 0.64, 1], // Custom spring-like easing
              opacity: { duration: 0.6 },
            }}
            className="relative"
          >
            {/* Glow effect behind logo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.5, scale: 1.2 }}
              transition={{ delay: 0.5, duration: 1, ease: "easeOut" }}
              className="absolute inset-0 blur-3xl bg-primary/30 rounded-full"
            />
            
            {/* Logo image */}
            <motion.img
              src={lactronLogo}
              alt="LACTRON Logo"
              className="w-32 h-32 md:w-40 md:h-40 object-contain relative z-10 drop-shadow-2xl"
              initial={{ filter: "brightness(0)" }}
              animate={{ filter: "brightness(1)" }}
              transition={{ delay: 0.3, duration: 0.8 }}
            />

            {/* Pulse ring effect */}
            <motion.div
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{
                delay: 0.8,
                duration: 1.2,
                ease: "easeOut",
                repeat: 1,
                repeatDelay: 0.3,
              }}
              className="absolute inset-0 border-2 border-primary rounded-full"
            />
          </motion.div>

          {/* Tagline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={showTagline ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="mt-8 text-center"
          >
            <motion.h1
              className="text-2xl md:text-3xl font-light tracking-wide text-foreground"
              initial={{ opacity: 0 }}
              animate={showTagline ? { opacity: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <span className="font-bold text-primary">Intelligence</span>
              <span className="text-muted-foreground"> in Every </span>
              <motion.span
                className="font-bold text-primary inline-block"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={showTagline ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.5, delay: 0.6, ease: "backOut" }}
              >
                Drop.
              </motion.span>
            </motion.h1>

            {/* Subtle underline animation */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={showTagline ? { scaleX: 1 } : {}}
              transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
              className="h-0.5 w-48 mx-auto mt-4 bg-gradient-to-r from-transparent via-primary to-transparent"
            />
          </motion.div>

          {/* Loading dots */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={showTagline ? { opacity: 1 } : {}}
            transition={{ delay: 1.2 }}
            className="flex gap-2 mt-12"
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.4, 1, 0.4],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeInOut",
                }}
                className="w-2 h-2 rounded-full bg-primary"
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
