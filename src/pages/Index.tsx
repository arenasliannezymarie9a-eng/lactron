import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Auth from "./Auth";
import { authAPI } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

const Index = () => {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const response = await authAPI.checkSession();
      if (response.success) {
        navigate('/dashboard');
      } else {
        setIsChecking(false);
      }
    };
    checkAuth();
  }, [navigate]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  return <Auth />;
};

export default Index;
