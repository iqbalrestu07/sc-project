import React from "react";
import { motion } from "framer-motion";

export function RevealText({ 
  text, 
  className = "", 
  delay = 0 
}: { 
  text: string; 
  className?: string;
  delay?: number;
}) {
  const words = text.split(" ");
  
  return (
    <span className={`inline-block ${className}`}>
      {words.map((word, i) => (
        <span key={i} style={{ display: "inline-block", overflow: "hidden", marginRight: "0.25em", verticalAlign: "bottom" }}>
          <motion.span
            style={{ display: "inline-block" }}
            initial={{ y: "100%", opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ 
              duration: 0.7, 
              ease: [0.25, 1, 0.5, 1], // Custom cubic-bezier for a snappy premium feel
              delay: delay + (i * 0.04) 
            }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </span>
  );
}
