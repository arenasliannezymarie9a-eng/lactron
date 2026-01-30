import { useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import MeshBackground from "@/components/ui/MeshBackground";
import AuthCard from "@/components/auth/AuthCard";
import SplashScreen from "@/components/splash/SplashScreen";
import { Helmet } from "react-helmet-async";

const Auth = () => {
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  return (
    <>
      <Helmet>
        <title>LACTRON | Solar-Powered IoT Milk Quality Monitoring</title>
        <meta 
          name="description" 
          content="LACTRON - An IoT-based smart system for milk quality monitoring with AI-driven spoilage prediction. Access the quality monitoring portal." 
        />
      </Helmet>
      
      <AnimatePresence mode="wait">
        {showSplash && (
          <SplashScreen onComplete={handleSplashComplete} />
        )}
      </AnimatePresence>

      {!showSplash && (
        <div className="min-h-screen flex items-center justify-center p-4">
          <MeshBackground />
          <AuthCard />
        </div>
      )}
    </>
  );
};

export default Auth;
