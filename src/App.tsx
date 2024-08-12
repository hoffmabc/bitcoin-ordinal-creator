import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Dashboard from './components/Dashboard';
import CreateOrdinalModal from './components/CreateOrdinalModal';

const App = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 py-6 flex flex-col justify-center sm:py-12">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8"
      >
        <div className="bg-gray-800 shadow-lg rounded-3xl overflow-hidden">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-3xl font-bold mb-5 text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
              Bitcoin Ordinal Dashboard
            </h1>
            <Dashboard onCreateOrdinal={() => setIsModalOpen(true)} />
          </div>
        </div>
      </motion.div>
      <CreateOrdinalModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};

export default App;