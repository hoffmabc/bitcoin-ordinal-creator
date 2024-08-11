import React from 'react';
import OrdinalCreator from './OrdinalCreator';
import { motion } from 'framer-motion';

const App = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 py-6 flex flex-col justify-center sm:py-12">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative sm:max-w-xl sm:mx-auto w-full px-4 sm:px-0"
      >
        <div className="bg-gray-800 shadow-lg rounded-3xl overflow-hidden">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-3xl font-bold mb-5 text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
              Bitcoin Ordinal Creator
            </h1>
            <OrdinalCreator />
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default App;