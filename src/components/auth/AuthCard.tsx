import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Mail, User, Zap, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { authAPI } from "@/lib/api";
import PasswordMatchIndicator from "./PasswordMatchIndicator";
import lactronLogo from "@/assets/lactron-logo.png";

type AuthMode = "login" | "signup";

// Animation variants for smooth transitions
const pageVariants = {
  initial: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 40 : -40,
    scale: 0.98,
  }),
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: "easeOut" as const,
    },
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -40 : 40,
    scale: 0.98,
    transition: {
      duration: 0.3,
      ease: "easeIn" as const,
    },
  }),
};

const AuthCard = () => {
  const [mode, setMode] = useState<AuthMode>("login");
  const [direction, setDirection] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const response = await authAPI.login(email, password);
    
    if (response.success) {
      toast.success("Access granted!");
      navigate("/dashboard");
    } else {
      toast.error(response.error || "No account matches with these details.");
    }
    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    
    setIsLoading(true);
    
    const response = await authAPI.signup(email, password, name);
    
    if (response.success) {
      toast.success("Account created successfully!");
      navigate("/dashboard");
    } else {
      toast.error(response.error || "Failed to create account");
    }
    setIsLoading(false);
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setName("");
  };

  const switchMode = (newMode: AuthMode) => {
    const modeOrder: AuthMode[] = ["login", "signup"];
    const currentIndex = modeOrder.indexOf(mode);
    const newIndex = modeOrder.indexOf(newMode);
    setDirection(newIndex > currentIndex ? 1 : -1);
    
    resetForm();
    setMode(newMode);
  };

  const LoadingSpinner = () => (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    >
      <Zap className="w-5 h-5" />
    </motion.div>
  );

  const inputClasses = "pl-10 h-12 rounded-xl bg-secondary/50 border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-full max-w-md"
    >
      {/* Logo Header */}
      <div className="text-center mb-10">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "backOut" }}
          className="flex flex-col items-center gap-4 mb-3"
        >
          <motion.img
            src={lactronLogo}
            alt="LACTRON"
            className="w-20 h-20 md:w-24 md:h-24 object-contain drop-shadow-lg"
            whileHover={{ scale: 1.05, rotate: 3 }}
            transition={{ type: "spring", stiffness: 400 }}
          />
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-primary">
            LACTRON
          </h1>
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-base md:text-lg font-bold text-foreground tracking-wide"
        >
          Intelligence in Every Drop.
        </motion.p>
      </div>

      {/* Auth Card */}
      <motion.div 
        layout
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="glass-card rounded-3xl p-8 shadow-xl overflow-hidden"
      >
        {/* Login/Signup Tabs */}
        <div className="flex bg-secondary rounded-xl p-1 mb-8">
          {(["login", "signup"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => switchMode(tab)}
              className={`relative flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
                mode === tab
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {mode === tab && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-card rounded-lg shadow-sm"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">
                {tab === "login" ? "Login" : "Sign Up"}
              </span>
            </button>
          ))}
        </div>

        {/* Form Container with AnimatePresence */}
        <AnimatePresence mode="wait" custom={direction}>
          {mode === "login" && (
            <motion.form
              key="login"
              custom={direction}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              onSubmit={handleLogin}
              className="space-y-5"
            >
              <div>
                <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Email
                </Label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@facility.com"
                    required
                    className={inputClasses}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Password
                </Label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className={inputClasses}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 rounded-xl text-base font-semibold mt-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
              >
                {isLoading ? <LoadingSpinner /> : "Access Dashboard"}
              </Button>
            </motion.form>
          )}

          {mode === "signup" && (
            <motion.form
              key="signup"
              custom={direction}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              onSubmit={handleSignup}
              className="space-y-5"
            >
              <div>
                <Label htmlFor="name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Full Name
                </Label>
                <div className="relative mt-1.5">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Dr. Jane Smith"
                    required
                    className={inputClasses}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="signup-email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Email
                </Label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@facility.com"
                    required
                    className={inputClasses}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="signup-password" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Password
                </Label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className={inputClasses}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="confirm-password" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Confirm Password
                </Label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className={inputClasses}
                  />
                </div>
                <PasswordMatchIndicator
                  password={password}
                  confirmPassword={confirmPassword}
                  show={confirmPassword.length > 0}
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 rounded-xl text-base font-semibold mt-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
              >
                {isLoading ? <LoadingSpinner /> : "Create Account"}
              </Button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Security Note */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex items-center justify-center gap-2 mt-6 text-xs text-muted-foreground"
      >
        <Shield className="w-3.5 h-3.5" />
        <span>Secure Encrypted Connection Active</span>
      </motion.div>
    </motion.div>
  );
};

export default AuthCard;
