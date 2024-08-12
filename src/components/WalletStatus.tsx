import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AddressPurpose, 
  BitcoinNetworkType, 
  getAddress, 
  GetAddressOptions 
} from 'sats-connect';

const WalletStatus: React.FC<{
  connected: boolean;
  publicKey: string;
  balance: { confirmed: number | null; unconfirmed: number | null };
  onConnect: (address: string) => void;
  isTestnet: boolean;
}> = ({ connected, publicKey, balance, onConnect, isTestnet }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleConnectWallet = async () => {
    try {
      const getAddressOptions: GetAddressOptions = {
        payload: {
          purposes: [AddressPurpose.Ordinals, AddressPurpose.Payment],
          message: 'Address for receiving ordinals and payment',
          network: {
            type: isTestnet ? BitcoinNetworkType.Testnet : BitcoinNetworkType.Mainnet
          },
        },
        onFinish: (response) => {
          const address = response.addresses[0].address;
          onConnect(address);
          setIsModalOpen(false);
        },
        onCancel: () => setIsModalOpen(false),
      };

      await getAddress(getAddressOptions);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Failed to connect wallet. Please try again.');
    }
  };

  if (!connected) {
    return (
      <>
        <button
          className="w-full py-2 px-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-md text-white font-semibold shadow-lg hover:from-blue-600 hover:to-purple-700 transition duration-300"
          onClick={() => setIsModalOpen(true)}
        >
          Connect Wallet
        </button>
        <AnimatePresence>
          {isModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-gray-800 rounded-lg p-6 w-full max-w-md"
              >
                <h2 className="text-2xl font-bold mb-4">Connect Wallet</h2>
                <p className="mb-4">Please connect your wallet to continue.</p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-gray-600 rounded-md text-white hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConnectWallet}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-md text-white font-semibold hover:from-blue-600 hover:to-purple-700 transition-colors"
                  >
                    Connect
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <div className="bg-gray-700 rounded-lg p-4">
      <p className="text-sm mb-2">Wallet Connected:</p>
      <p className="text-xs text-gray-300 break-all">{publicKey}</p>
      <div className="mt-2 flex justify-between">
        <div>
          <p className="text-sm">Confirmed Balance:</p>
          <p className="text-lg font-bold text-green-400">
            {balance.confirmed !== null ? `${balance.confirmed} satoshis` : 'Loading...'}
          </p>
        </div>
        <div>
          <p className="text-sm">Unconfirmed Balance:</p>
          <p className="text-lg font-bold text-yellow-400">
            {balance.unconfirmed !== null ? `${balance.unconfirmed} satoshis` : 'Loading...'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default WalletStatus;