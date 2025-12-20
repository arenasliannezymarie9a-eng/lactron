import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Mail, User, Shield, Zap, HelpCircle, KeyRound, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { authAPI, SecurityQuestion } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AuthMode = "login" | "signup" | "forgot" | "security_question" | "reset_password";

const AuthCard = () => {
  const [mode, setMode] = useState<AuthMode>("login");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  
  // Security questions
  const [securityQuestions, setSecurityQuestions] = useState<SecurityQuestion[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  
  // Forgot password flow
  const [userSecurityQuestion, setUserSecurityQuestion] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  // Load security questions on mount
  useEffect(() => {
    const loadSecurityQuestions = async () => {
      const response = await authAPI.getSecurityQuestions();
      if (response.success && response.data) {
        setSecurityQuestions(response.data);
        // Randomly select one question
        if (response.data.length > 0) {
          const randomIndex = Math.floor(Math.random() * response.data.length);
          setSelectedQuestionId(response.data[randomIndex].id.toString());
        }
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
    
    if (!selectedQuestionId || !securityAnswer) {
      toast.error("Security question and answer are required");
      return;
    }
    
    setIsLoading(true);
    
    const response = await authAPI.signup(
      email, 
      password, 
      name, 
      parseInt(selectedQuestionId), 
      securityAnswer
    );
    
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
    resetForm();
    setMode(newMode);
    // Re-randomize security question for signup
    if (newMode === "signup" && securityQuestions.length > 0) {
      const randomIndex = Math.floor(Math.random() * securityQuestions.length);
      setSelectedQuestionId(securityQuestions[randomIndex].id.toString());
    }
  };

  const getSelectedQuestion = () => {
    return securityQuestions.find(q => q.id.toString() === selectedQuestionId)?.question || "";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-full max-w-md"
    >
      {/* Logo Header */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="inline-flex items-center gap-2 mb-2"
        >
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Zap className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            <span className="text-primary">LACTRON</span>
            <span className="text-muted-foreground font-light">.io</span>
          </h1>
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-sm text-muted-foreground uppercase tracking-widest"
        >
          Quality Monitoring Portal
        </motion.p>
      </div>

      {/* Auth Card */}
      <motion.div layout className="glass-card rounded-3xl p-8 shadow-xl">
        {/* Login/Signup Tabs */}
        {(mode === "login" || mode === "signup") && (
          <div className="flex bg-secondary rounded-xl p-1 mb-8">
            {(["login", "signup"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => switchMode(tab)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
                  mode === tab
                    ? "bg-card text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === "login" ? "Login" : "Sign Up"}
              </button>
            ))}
          </div>
        )}

        {/* Back button for forgot password flow */}
        {(mode === "forgot" || mode === "security_question" || mode === "reset_password") && (
          <button
            onClick={() => switchMode("login")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Login</span>
          </button>
        )}

        {/* Login Form */}
        {mode === "login" && (
          <form onSubmit={handleLogin} className="space-y-5">
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
                  className="pl-10 h-12 rounded-xl bg-secondary/50 border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20"
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
                  className="pl-10 h-12 rounded-xl bg-secondary/50 border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl text-base font-semibold mt-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Zap className="w-5 h-5" />
                </motion.div>
              ) : (
                "Access Dashboard"
              )}
            </Button>
          </form>
        )}

        {/* Signup Form */}
        {mode === "signup" && (
          <form onSubmit={handleSignup} className="space-y-5">
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
                  className="pl-10 h-12 rounded-xl bg-secondary/50 border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20"
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
                  className="pl-10 h-12 rounded-xl bg-secondary/50 border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20"
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
                  className="pl-10 h-12 rounded-xl bg-secondary/50 border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20"
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
                  className="pl-10 h-12 rounded-xl bg-secondary/50 border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Security Question */}
            <div className="space-y-3 p-4 bg-secondary/30 rounded-xl">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <HelpCircle className="w-4 h-4" />
                <span>Security Question</span>
              </div>
              
              <Select value={selectedQuestionId} onValueChange={setSelectedQuestionId}>
                <SelectTrigger className="h-12 rounded-xl bg-secondary/50 border-transparent">
                  <SelectValue placeholder="Select a security question" />
                </SelectTrigger>
                <SelectContent>
                  {securityQuestions.map((q) => (
                    <SelectItem key={q.id} value={q.id.toString()}>
                      {q.question}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div>
                <Label htmlFor="security-answer" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Your Answer (Case-Sensitive)
                </Label>
                <Input
                  id="security-answer"
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  placeholder="Enter your answer"
                  required
                  className="mt-1.5 h-12 rounded-xl bg-secondary/50 border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <p className="text-xs text-amber-500 mt-1">
                  ⚠️ This answer is case-sensitive and will be used for password recovery.
                </p>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl text-base font-semibold mt-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Zap className="w-5 h-5" />
                </motion.div>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>
        )}

        {/* Forgot Password - Email Entry */}
        {mode === "forgot" && (
          <form onSubmit={handleForgotPassword} className="space-y-5">
            <div className="text-center mb-4">
              <KeyRound className="w-12 h-12 mx-auto text-primary mb-2" />
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
                  className="pl-10 h-12 rounded-xl bg-secondary/50 border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl text-base font-semibold transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Zap className="w-5 h-5" />
                </motion.div>
              ) : (
                "Continue"
              )}
            </Button>
          </form>
        )}

        {/* Security Question Verification */}
        {mode === "security_question" && (
          <form onSubmit={handleVerifySecurityAnswer} className="space-y-5">
            <div className="text-center mb-4">
              <HelpCircle className="w-12 h-12 mx-auto text-primary mb-2" />
              <h2 className="text-lg font-bold">Security Verification</h2>
              <p className="text-sm text-muted-foreground">Answer your security question</p>
            </div>

            <div className="p-4 bg-secondary/30 rounded-xl">
              <p className="text-sm font-semibold mb-1">Your Security Question:</p>
              <p className="text-foreground">{userSecurityQuestion}</p>
            </div>

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
                className="mt-1.5 h-12 rounded-xl bg-secondary/50 border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-xs text-amber-500 mt-1">
                ⚠️ Remember, your answer is case-sensitive.
              </p>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl text-base font-semibold transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Zap className="w-5 h-5" />
                </motion.div>
              ) : (
                "Verify Answer"
              )}
            </Button>
          </form>
        )}

        {/* Reset Password */}
        {mode === "reset_password" && (
          <form onSubmit={handleResetPassword} className="space-y-5">
            <div className="text-center mb-4">
              <Lock className="w-12 h-12 mx-auto text-primary mb-2" />
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
                  className="pl-10 h-12 rounded-xl bg-secondary/50 border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20"
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
                  className="pl-10 h-12 rounded-xl bg-secondary/50 border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl text-base font-semibold transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Zap className="w-5 h-5" />
                </motion.div>
              ) : (
                "Update Password"
              )}
            </Button>
          </form>
        )}

        {/* Forgot Password Link */}
        {mode === "login" && (
          <div className="text-center mt-6">
            <button 
              onClick={() => switchMode("forgot")}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Forgot Password?
            </button>
          </div>
        )}
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
