import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Mail, User, Zap, KeyRound, ArrowLeft, HelpCircle, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { authAPI, SecurityQuestion } from "@/lib/api";
import PasswordMatchIndicator from "./PasswordMatchIndicator";
import lactronLogo from "@/assets/lactron-logo.png";

type AuthMode = "login" | "signup" | "forgot" | "security_question" | "reset_password";

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
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  
  // Security questions (only for forgot password flow)
  const [securityQuestions, setSecurityQuestions] = useState<SecurityQuestion[]>([]);
  const [securityAnswer, setSecurityAnswer] = useState("");
  
  // Forgot password flow
  const [userSecurityQuestion, setUserSecurityQuestion] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  // Load security questions (for forgot password only)
  useEffect(() => {
    const loadSecurityQuestions = async () => {
      const response = await authAPI.getSecurityQuestions();
      if (response.success && response.data) {
        setSecurityQuestions(response.data);
      }
    };
    loadSecurityQuestions();
  }, []);

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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const response = await authAPI.getUserSecurityQuestion(email);
    
    if (response.success && response.data) {
      setUserSecurityQuestion(response.data.question);
      setDirection(1);
      setMode("security_question");
    } else {
      toast.error(response.error || "No account matches with these details.");
    }
    setIsLoading(false);
  };

  const handleVerifySecurityAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const response = await authAPI.verifySecurityAnswer(email, securityAnswer);
    
    if (response.success && response.data) {
      setResetToken(response.data.reset_token);
      setDirection(1);
      setMode("reset_password");
    } else {
      toast.error(response.error || "Security answer does not match. Remember, the answer is case-sensitive.");
    }
    setIsLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmNewPassword) {
      toast.error("Passwords do not match");
      return;
    }
    
    setIsLoading(true);
    
    const response = await authAPI.resetPassword(resetToken, newPassword);
    
    if (response.success) {
      toast.success("Password updated successfully! Please log in.");
      resetForm();
      setDirection(-1);
      setMode("login");
    } else {
      toast.error(response.error || "Failed to reset password");
    }
    setIsLoading(false);
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setName("");
    setSecurityAnswer("");
    setUserSecurityQuestion("");
    setResetToken("");
    setNewPassword("");
    setConfirmNewPassword("");
  };

  const switchMode = (newMode: AuthMode) => {
    // Determine animation direction
    const modeOrder: AuthMode[] = ["login", "signup", "forgot", "security_question", "reset_password"];
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
        <AnimatePresence mode="wait">
          {(mode === "login" || mode === "signup") && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex bg-secondary rounded-xl p-1 mb-8"
            >
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
            </motion.div>
          )}
        </AnimatePresence>

        {/* Back button for forgot password flow */}
        <AnimatePresence mode="wait">
          {(mode === "forgot" || mode === "security_question" || mode === "reset_password") && (
            <motion.button
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              onClick={() => switchMode("login")}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors group"
            >
              <motion.div
                whileHover={{ x: -3 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <ArrowLeft className="w-4 h-4" />
              </motion.div>
              <span className="text-sm">Back to Login</span>
            </motion.button>
          )}
        </AnimatePresence>

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

          {mode === "forgot" && (
            <motion.form
              key="forgot"
              custom={direction}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              onSubmit={handleForgotPassword}
              className="space-y-5"
            >
              <div className="text-center mb-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <KeyRound className="w-12 h-12 mx-auto text-primary mb-2" />
                </motion.div>
                <h2 className="text-lg font-bold">Forgot Password</h2>
                <p className="text-sm text-muted-foreground">Enter your email to recover your account</p>
              </div>

              <div>
                <Label htmlFor="forgot-email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Email
                </Label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@facility.com"
                    required
                    className={inputClasses}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 rounded-xl text-base font-semibold transition-all duration-300 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
              >
                {isLoading ? <LoadingSpinner /> : "Continue"}
              </Button>
            </motion.form>
          )}

          {mode === "security_question" && (
            <motion.form
              key="security_question"
              custom={direction}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              onSubmit={handleVerifySecurityAnswer}
              className="space-y-5"
            >
              <div className="text-center mb-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <HelpCircle className="w-12 h-12 mx-auto text-primary mb-2" />
                </motion.div>
                <h2 className="text-lg font-bold">Security Verification</h2>
                <p className="text-sm text-muted-foreground">Answer your security question</p>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="p-4 bg-secondary/30 rounded-xl border border-primary/20"
              >
                <p className="text-sm font-semibold mb-1 text-muted-foreground">Your Security Question:</p>
                <p className="text-foreground font-medium">{userSecurityQuestion}</p>
              </motion.div>

              <div>
                <Label htmlFor="verify-answer" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Your Answer (Case-Sensitive)
                </Label>
                <Input
                  id="verify-answer"
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  placeholder="Enter your answer"
                  required
                  className={`mt-1.5 ${inputClasses.replace('pl-10', 'pl-4')}`}
                />
                <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                  <span>⚠️</span> Remember, your answer is case-sensitive.
                </p>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 rounded-xl text-base font-semibold transition-all duration-300 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
              >
                {isLoading ? <LoadingSpinner /> : "Verify Answer"}
              </Button>
            </motion.form>
          )}

          {mode === "reset_password" && (
            <motion.form
              key="reset_password"
              custom={direction}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              onSubmit={handleResetPassword}
              className="space-y-5"
            >
              <div className="text-center mb-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <Lock className="w-12 h-12 mx-auto text-primary mb-2" />
                </motion.div>
                <h2 className="text-lg font-bold">Reset Password</h2>
                <p className="text-sm text-muted-foreground">Enter your new password</p>
              </div>

              <div>
                <Label htmlFor="new-password" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  New Password
                </Label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className={inputClasses}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="confirm-new-password" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Confirm New Password
                </Label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirm-new-password"
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className={inputClasses}
                  />
                </div>
                <PasswordMatchIndicator
                  password={newPassword}
                  confirmPassword={confirmNewPassword}
                  show={confirmNewPassword.length > 0}
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading || (newPassword !== confirmNewPassword && confirmNewPassword.length > 0)}
                className="w-full h-12 rounded-xl text-base font-semibold transition-all duration-300 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] disabled:opacity-50"
              >
                {isLoading ? <LoadingSpinner /> : "Update Password"}
              </Button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Forgot Password Link */}
        <AnimatePresence>
          {mode === "login" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center mt-6"
            >
              <button 
                onClick={() => switchMode("forgot")}
                className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200"
              >
                Forgot Password?
              </button>
            </motion.div>
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
