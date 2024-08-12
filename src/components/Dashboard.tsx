import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import WalletStatus from './WalletStatus';
import OrdinalsList from './OrdinalsList';
import { BitcoinNetworkType } from 'sats-connect';
import Wallet from 'sats-connect';import axios from 'axios';

interface Ordinal {
  inscriptionId: string;
  inscriptionNumber: string;
  contentType: string;
  genesisTransaction: string;
  timestamp: number;
  preview: string;
}

interface InscriptionsResponse {
  total: number;
  inscriptions: Ordinal[];
  limit: number;
  offset: number;
}

const LIMIT = 60;

const Dashboard: React.FC<{ onCreateOrdinal: () => void }> = ({ onCreateOrdinal }) => {
  const [walletConnected, setWalletConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<string>('');
  const [balance, setBalance] = useState({ confirmed: 0, unconfirmed: 0 });
  const [ordinals, setOrdinals] = useState<Ordinal[]>([]);
  const [isTestnet, setIsTestnet] = useState(true);
  const [isLoadingOrdinals, setIsLoadingOrdinals] = useState(false);
  const [totalInscriptions, setTotalInscriptions] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [hasMoreOrdinals, setHasMoreOrdinals] = useState(true);

  useEffect(() => {
    if (publicKey) {
      checkBalance(publicKey);
      fetchWalletOrdinals(0);
    }
  }, [publicKey, isTestnet]);

  const getNetworkType = (): BitcoinNetworkType => {
    return isTestnet ? BitcoinNetworkType.Testnet : BitcoinNetworkType.Mainnet;
  };

  const getBlockstreamApiUrl = (): string => {
    return isTestnet ? 'https://blockstream.info/testnet/api' : 'https://blockstream.info/api';
  };

  const checkBalance = async (address: string) => {
    try {
      const response = await axios.get(`${getBlockstreamApiUrl()}/address/${address}`);
      const confirmedBalance = response.data.chain_stats.funded_txo_sum - response.data.chain_stats.spent_txo_sum;
      const totalBalance = response.data.mempool_stats.funded_txo_sum - response.data.mempool_stats.spent_txo_sum + confirmedBalance;
      
      setBalance({
        confirmed: confirmedBalance,
        unconfirmed: totalBalance - confirmedBalance
      });
    } catch (error) {
      console.error('Error fetching balance:', error);
      setBalance({ confirmed: 0, unconfirmed: 0 });
    }
  };

  const requestInscriptionPermission = async () => {
    try {
      const response = await Wallet.request('wallet_requestPermissions', undefined);

      if (response.status === 'success') {
        setHasPermission(true);
        return true;
      } else {
        console.error('Permission request failed:', response.error);
        setHasPermission(false);
        return false;
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      setHasPermission(false);
      return false;
    }
  };

  const fetchWalletOrdinals = async (offset: number = 0) => {
    if (!publicKey) return;
    if (!hasPermission) {
      const permissionGranted = await requestInscriptionPermission();
      if (!permissionGranted) {
        alert('Permission to access inscriptions was denied. Please grant permission to view your ordinals.');
        return;
      }
    }

    setIsLoadingOrdinals(true);
    try {
      const response = await Wallet.request('ord_getInscriptions', {
        offset: offset,
        limit: LIMIT,
      });

      if (response.status === 'success') {
        const data = response.result as unknown as InscriptionsResponse;
        const fetchedOrdinals: Ordinal[] = data.inscriptions.map(inscription => ({
          ...inscription,
          inscriptionNumber: inscription.inscriptionNumber,
          preview: `https://${isTestnet ? 'testnet.' : ''}ordinals.com/content/${inscription.inscriptionId}`
        }));
      
        setOrdinals(prevOrdinals => [...prevOrdinals, ...fetchedOrdinals]);
        setTotalInscriptions(data.total);
        setCurrentOffset(offset + fetchedOrdinals.length);
        setHasMoreOrdinals(fetchedOrdinals.length === LIMIT);
      } else {
        console.error('Error fetching inscriptions:', response.error);
        alert('Failed to fetch inscriptions. Please try again.');
      }
    } catch (error) {
      console.error('Error fetching wallet ordinals:', error);
      alert('An error occurred while fetching ordinals. Please try again.');
    } finally {
      setIsLoadingOrdinals(false);
    }
  };

  const loadMoreOrdinals = () => {
    if (hasMoreOrdinals && !isLoadingOrdinals) {
      fetchWalletOrdinals(currentOffset);
    }
  };

  const handleConnect = (address: string) => {
    setPublicKey(address);
    setWalletConnected(true);
  };

  const toggleNetwork = () => {
    setIsTestnet(!isTestnet);
    setWalletConnected(false);
    setPublicKey('');
    setBalance({ confirmed: 0, unconfirmed: 0 });
    setOrdinals([]);
    setCurrentOffset(0);
    setHasMoreOrdinals(true);
    setHasPermission(false);
  };

  return (
    <div className="space-y-6">
      <WalletStatus
        connected={walletConnected}
        publicKey={publicKey}
        balance={balance}
        onConnect={handleConnect}
        isTestnet={isTestnet}
        onToggleNetwork={toggleNetwork}
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
          <OrdinalsList 
            ordinals={ordinals} 
            isLoading={isLoadingOrdinals}
            totalInscriptions={totalInscriptions}
            hasMore={hasMoreOrdinals}
            onLoadMore={loadMoreOrdinals}
            isTestnet={isTestnet}
          />
        </>
      )}
    </div>
  );
};

export default Dashboard;