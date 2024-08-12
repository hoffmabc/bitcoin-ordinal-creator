import React from 'react';
import { motion } from 'framer-motion';

const OrdinalsList: React.FC<{ ordinals: Array<{
  inscriptionId: string;
  inscriptionNumber: number;
  contentType: string;
  genesisTransaction: string;
  timestamp: number;
}> }> = ({ ordinals }) => {
  if (ordinals.length === 0) {
    return <p className="text-center text-gray-400">No ordinals found in this wallet.</p>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">Your Ordinals</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ordinals.map((ordinal) => (
          <motion.div
            key={ordinal.inscriptionId}
            className="bg-gray-700 rounded-lg p-4 shadow-md"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <img 
              src={`https://ord-testnet.xverse.app/content/${ordinal.inscriptionId}`}
              alt={`Ordinal ${ordinal.inscriptionNumber}`} 
              className="w-full h-40 object-cover rounded-md mb-2"
            />
            <p><strong>Inscription Number:</strong> {ordinal.inscriptionNumber}</p>
            <p><strong>Content Type:</strong> {ordinal.contentType}</p>
            <p><strong>Transaction ID:</strong> {ordinal.genesisTransaction.slice(0, 10)}...</p>
            <p><strong>Timestamp:</strong> {new Date(ordinal.timestamp * 1000).toLocaleString()}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default OrdinalsList;