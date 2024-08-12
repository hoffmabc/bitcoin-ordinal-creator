import React from 'react';
import { motion } from 'framer-motion';

interface Ordinal {
  inscriptionId: string;
  inscriptionNumber: string;
  contentType: string;
  genesisTransaction: string;
  timestamp: number;
}

interface OrdinalsListProps {
  ordinals: Ordinal[];
  isLoading: boolean;
  totalInscriptions: number;
  hasMore: boolean;
  onLoadMore: () => void;
  isTestnet: boolean;
}

const OrdinalsList: React.FC<OrdinalsListProps> = ({ 
  ordinals, 
  isLoading, 
  totalInscriptions, 
  hasMore, 
  onLoadMore,
  isTestnet 
}) => {
  if (isLoading && ordinals.length === 0) {
    return <p className="text-center text-gray-400">Loading wallet ordinals...</p>;
  }

  if (ordinals.length === 0) {
    return <p className="text-center text-gray-400">No ordinals found in this wallet on {isTestnet ? 'testnet' : 'mainnet'}.</p>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">Your Ordinals</h2>
      <p>Total Inscriptions: {totalInscriptions}</p>
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
              src={`https://${isTestnet ? 'testnet.' : ''}ordinals.com/content/${ordinal.inscriptionId}`}
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
      {hasMore && (
        <button 
          onClick={onLoadMore}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
};

export default OrdinalsList;