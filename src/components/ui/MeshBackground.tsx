import { motion } from "framer-motion";

const MeshBackground = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-background" />
      <motion.div
        className="absolute inset-0 mesh-gradient"
        animate={{
          background: [
            "radial-gradient(circle at 10% 20%, hsl(var(--mesh-1)) 0%, transparent 40%), radial-gradient(circle at 90% 80%, hsl(var(--mesh-2)) 0%, transparent 40%)",
            "radial-gradient(circle at 20% 30%, hsl(var(--mesh-1)) 0%, transparent 45%), radial-gradient(circle at 80% 70%, hsl(var(--mesh-2)) 0%, transparent 45%)",
            "radial-gradient(circle at 10% 20%, hsl(var(--mesh-1)) 0%, transparent 40%), radial-gradient(circle at 90% 80%, hsl(var(--mesh-2)) 0%, transparent 40%)",
          ],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{ filter: "blur(80px)" }}
      />
    </div>
  );
};

export default MeshBackground;
