"use client";

import { motion } from "framer-motion";
import { Upload } from "lucide-react";

export function ChatZeroState() {
  return (
    <div className="max-w-3xl mx-auto md:mt-20 px-8 size-full flex flex-col justify-center items-center text-center">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.3 }}
      >
        <Upload className="h-16 w-16 text-muted-foreground mb-6 mx-auto" />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.4 }}
        className="text-2xl font-semibold mb-3"
      >
        Upload documents to get started
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.5 }}
        className="text-base text-muted-foreground max-w-md"
      >
        Upload your research documents using the Documents panel on the left. Once uploaded, you&apos;ll be able to ask questions and explore insights.
      </motion.div>
    </div>
  );
}
