'use client';

import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';

function AnimatedSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
      transition={{ 
        duration: 0.6, 
        delay,
        ease: [0.6, -0.05, 0.01, 0.99] 
      }}
    >
      {children}
    </motion.div>
  );
}

export default function Schedule() {
  return (
    <div className="min-h-screen bg-white p-8">
      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.6, -0.05, 0.01, 0.99] }}
        className="text-3xl font-bold"
      >
        Schedule
      </motion.h1>
      <AnimatedSection delay={0.2}>
        <p className="mt-4 text-gray-600">Schedule page content coming soon...</p>
      </AnimatedSection>
    </div>
  );
}

