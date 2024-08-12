import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AddressPurpose, 
  BitcoinNetworkType, 
  getAddress, 
  GetAddressOptions 
} from 'sats-connect';
import { Switch } from '@headlessui/react';

interface WalletStatusProps {
  connected: boolean;
  publicKey: string;
  balance: { confirmed: number; unconfirmed: number };
  onConnect: (address: string) => void;
  isTestnet: boolean;
  onToggleNetwork: () => void;
}

const WalletStatus: React.FC<WalletStatusProps> = ({ 
  connected, 
  publicKey, 
  balance, 
  onConnect, 
  isTestnet,
  onToggleNetwork
}) => {
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

  return (
    <div className="bg-gray-700 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Wallet Status</h2>
        <Switch
          checked={!isTestnet}
          onChange={onToggleNetwork}
          className={`${
            !isTestnet ? 'bg-purple-600' : 'bg-gray-600'
          } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2`}
        >
          <span className="sr-only">Toggle network</span>
          <span
            className={`${
              !isTestnet ? 'translate-x-6' : 'translate-x-1'
            } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
          />
        </Switch>
      </div>
      <p className="text-sm mb-2">Current network: {isTestnet ? 'Testnet' : 'Mainnet'}</p>
      
      {!connected ? (
        <button
          className="w-full py-2 px-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-md text-white font-semibold shadow-lg hover:from-blue-600 hover:to-purple-700 transition duration-300"
          onClick={() => setIsModalOpen(true)}
        >
          Connect Wallet
        </button>
      ) : (
        <>
          <p className="text-sm mb-2">Wallet Connected:</p>
          <p className="text-xs text-gray-300 break-all">{publicKey}</p>
          <div className="mt-2 flex justify-between">
            <div>
              <p className="text-sm">Confirmed Balance:</p>
              <p className="text-lg font-bold text-green-400">
                {balance.confirmed} satoshis
              </p>
            </div>
            <div>
              <p className="text-sm">Unconfirmed Balance:</p>
              <p className="text-lg font-bold text-yellow-400">
                {balance.unconfirmed} satoshis
              </p>
            </div>
          </div>
        </>
      )}

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
    </div>
  );
};

export default WalletStatus;