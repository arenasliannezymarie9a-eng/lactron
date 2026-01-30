import { motion } from "framer-motion";

const MeshBackground = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-secondary/30" />
      
      {/* Animated mesh gradients */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            "radial-gradient(ellipse 80% 50% at 20% 40%, hsl(199 89% 48% / 0.15) 0%, transparent 60%), radial-gradient(ellipse 60% 80% at 80% 60%, hsl(186 94% 82% / 0.12) 0%, transparent 50%)",
            "radial-gradient(ellipse 70% 60% at 30% 30%, hsl(199 89% 48% / 0.18) 0%, transparent 55%), radial-gradient(ellipse 80% 70% at 70% 70%, hsl(186 94% 82% / 0.15) 0%, transparent 55%)",
            "radial-gradient(ellipse 80% 50% at 20% 40%, hsl(199 89% 48% / 0.15) 0%, transparent 60%), radial-gradient(ellipse 60% 80% at 80% 60%, hsl(186 94% 82% / 0.12) 0%, transparent 50%)",
          ],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{ filter: "blur(60px)" }}
      />

      {/* Floating orbs for depth - light mode enhancement */}
      <motion.div
        className="absolute w-96 h-96 rounded-full opacity-20 dark:opacity-10"
        style={{
          background: "radial-gradient(circle, hsl(199 89% 60% / 0.4) 0%, transparent 70%)",
          top: "10%",
          left: "5%",
          filter: "blur(40px)",
        }}
        animate={{
          x: [0, 30, 0],
          y: [0, -20, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="absolute w-80 h-80 rounded-full opacity-15 dark:opacity-10"
        style={{
          background: "radial-gradient(circle, hsl(186 94% 70% / 0.5) 0%, transparent 70%)",
          bottom: "15%",
          right: "10%",
          filter: "blur(50px)",
        }}
        animate={{
          x: [0, -25, 0],
          y: [0, 30, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
      />

      {/* Subtle grid pattern for texture */}
      <div 
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(199 89% 48%) 1px, transparent 1px),
            linear-gradient(90deg, hsl(199 89% 48%) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Top gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-primary/5 to-transparent dark:from-primary/10" />
      
      {/* Bottom gradient for grounding */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-secondary/20 to-transparent" />
    </div>
  );
};

export default MeshBackground;
