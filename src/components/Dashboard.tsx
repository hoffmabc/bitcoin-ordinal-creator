import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import WalletStatus from './WalletStatus';
import OrdinalsList from './OrdinalsList';

const Dashboard: React.FC<{ onCreateOrdinal: () => void }> = ({ onCreateOrdinal }) => {
  const [walletConnected, setWalletConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<string>('');
  const [balance, setBalance] = useState({ confirmed: 0, unconfirmed: 0 });
  const [ordinals, setOrdinals] = useState([]);
  const [isTestnet, setIsTestnet] = useState(true);

  useEffect(() => {
    if (publicKey) {
      // Fetch balance and ordinals here
      // This is a placeholder for the actual implementation
      setBalance({ confirmed: 1000000, unconfirmed: 50000 });
      setOrdinals([]);
    }
  }, [publicKey]);

  const handleConnect = (address: string) => {
    setPublicKey(address);
    setWalletConnected(true);
  };

  return (
    <div className="space-y-6">
      <WalletStatus
        connected={walletConnected}
        publicKey={publicKey}
        balance={balance}
        onConnect={handleConnect}
        isTestnet={isTestnet}
      />
      {walletConnected && (
        <>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full py-2 px-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-md text-white font-semibold shadow-lg hover:from-purple-600 hover:to-pink-600 transition duration-300"
            onClick={onCreateOrdinal}
          >
            Create New Ordinal
          </motion.button>
          <OrdinalsList ordinals={ordinals} />
        </>
      )}
    </div>
  );
};

export default Dashboard;