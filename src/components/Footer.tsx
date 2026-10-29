import React from 'react';
import { motion } from 'motion/react';

export default function Footer() {
  return (
    <footer className="w-full py-8 flex flex-col items-center justify-center gap-2 mt-auto">
      <p className="text-[10px] tracking-[0.2em] font-sans font-bold text-black/40 uppercase">
        DEVELOPED BY
      </p>
      <a 
        href="https://www.easybyzcreator.com" 
        target="_blank" 
        rel="noopener noreferrer"
        className="group"
      >
        <motion.img 
          src="https://i.ibb.co/Kj1CTDrD/patitour-2026-04-11-T125246-010.png" 
          alt="EasyByz Logo" 
          className="h-32 object-contain brightness-0"
          initial={{ 
            opacity: 0.8,
            scale: 0.95
          }}
          whileHover={{ 
            opacity: 1,
            scale: 1.05
          }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          referrerPolicy="no-referrer"
        />
      </a>
    </footer>
  );
}
