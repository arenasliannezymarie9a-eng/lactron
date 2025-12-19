import MeshBackground from "@/components/ui/MeshBackground";
import AuthCard from "@/components/auth/AuthCard";
import { Helmet } from "react-helmet-async";

const Auth = () => {
  return (
    <>
      <Helmet>
        <title>LACTRON | Solar-Powered IoT Milk Quality Monitoring</title>
        <meta 
          name="description" 
          content="LACTRON - An IoT-based smart system for milk quality monitoring with AI-driven spoilage prediction. Access the quality monitoring portal." 
        />
      </Helmet>
      <div className="min-h-screen flex items-center justify-center p-4">
        <MeshBackground />
        <AuthCard />
      </div>
    </>
  );
};

export default Auth;
