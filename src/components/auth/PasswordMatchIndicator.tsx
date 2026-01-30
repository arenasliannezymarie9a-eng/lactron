import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";

interface PasswordMatchIndicatorProps {
  password: string;
  confirmPassword: string;
  show: boolean;
}

const PasswordMatchIndicator = ({ password, confirmPassword, show }: PasswordMatchIndicatorProps) => {
  if (!show || !confirmPassword) return null;

  const matches = password === confirmPassword && password.length > 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.2 }}
        className={`flex items-center gap-2 mt-2 text-sm ${
          matches ? "text-green-500" : "text-destructive"
        }`}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
        >
          {matches ? (
            <Check className="w-4 h-4" />
          ) : (
            <X className="w-4 h-4" />
          )}
        </motion.div>
        <span>
          {matches ? "Passwords match" : "Passwords do not match"}
        </span>
      </motion.div>
    </AnimatePresence>
  );
};

export default PasswordMatchIndicator;
