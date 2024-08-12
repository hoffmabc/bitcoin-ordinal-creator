import React, { useState, ChangeEvent, FormEvent, useEffect, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Switch } from '@headlessui/react';
import { 
  AddressPurpose, 
  BitcoinNetworkType, 
  getAddress, 
  GetAddressOptions, 
  createInscription, 
  CreateInscriptionOptions, 
  CreateInscriptionResponse
} from 'sats-connect';
import Wallet from 'sats-connect';
import axios from 'axios';

interface Inscription {
  inscriptionId: string;
  inscriptionNumber: string;
  parentInscriptionId: string | null;
  collectionName: string | null;
  contentType: string;
  genesisTransaction: string;
  timestamp: number;
  satNumber: string;
  output: string;
  postage: string;
}

interface Ordinal extends Inscription {
  preview: string;
}

interface CreatedOrdinal {
  id: string;
  contentType: string;
  content: string;
  status: string;
  timestamp: string;
}

interface InscriptionsResponse {
  total: number;
  inscriptions: Inscription[];
  limit: number;
  offset: number;
}

const OrdinalCreator: React.FC = () => {
  const [content, setContent] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [walletConnected, setWalletConnected] = useState<boolean>(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isTestnet, setIsTestnet] = useState<boolean>(true);
  const [confirmedBalance, setConfirmedBalance] = useState<number | null>(null);
  const [unconfirmedBalance, setUnconfirmedBalance] = useState<number | null>(null);
  const [ordinals, setOrdinals] = useState<Ordinal[]>([]);
  const [isLoadingOrdinals, setIsLoadingOrdinals] = useState<boolean>(false);
  const [totalInscriptions, setTotalInscriptions] = useState<number>(0);
  const [createdOrdinals, setCreatedOrdinals] = useState<CreatedOrdinal[]>([]);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [currentOffset, setCurrentOffset] = useState<number>(0);
  const [hasMoreOrdinals, setHasMoreOrdinals] = useState<boolean>(true);
  const LIMIT = 60; 

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

  useEffect(() => {
    checkWalletConnection();
  }, []);

  const checkWalletConnection = () => {
    setWalletConnected(!!publicKey);
  };

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
      
      setConfirmedBalance(confirmedBalance);
      setUnconfirmedBalance(totalBalance - confirmedBalance);
    } catch (error) {
      console.error('Error fetching balance:', error);
      setConfirmedBalance(null);
      setUnconfirmedBalance(null);
    }
  };

  const connectWallet = async () => {
    try {
      const getAddressOptions: GetAddressOptions = {
        payload: {
          purposes: [AddressPurpose.Ordinals, AddressPurpose.Payment],
          message: 'Address for receiving ordinals and payment',
          network: {
            type: getNetworkType()
          },
        },
        onFinish: (response) => {
          const address = response.addresses[0].address;
          setPublicKey(address);
          setWalletConnected(true);
          checkBalance(address);
        },
        onCancel: () => alert('Wallet connection was canceled'),
      };

      await getAddress(getAddressOptions);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Failed to connect wallet. Please try again.');
    }
  };

  const handleContentChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!walletConnected || !publicKey) {
      alert('Please connect your wallet first');
      return;
    }
    if (confirmedBalance === null || confirmedBalance === 0) {
      alert('Your confirmed balance is insufficient to create an ordinal. Please add funds to your address and wait for confirmation.');
      return;
    }
    setIsLoading(true);

    try {
      let inscriptionContent: string;
      let contentType: string;
      let payloadType: 'PLAIN_TEXT' | 'BASE_64';

      if (file) {
        inscriptionContent = await fileToBase64(file);
        contentType = file.type;
        payloadType = 'BASE_64';
      } else {
        inscriptionContent = content;
        contentType = 'text/plain';
        payloadType = 'PLAIN_TEXT';
      }

      console.log('Preparing inscription request with:', { contentType, payloadType });

      const response = await fetch('http://localhost:3002/api/create-inscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: inscriptionContent,
          contentType,
          address: publicKey,
          isTestnet,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to prepare inscription request: ${errorData.error || response.statusText}`);
      }

      const { inscriptionRequest } = await response.json();
      console.log('Received inscription request:', inscriptionRequest);

      const createInscriptionOptions: CreateInscriptionOptions = {
        payload: {
          network: {
            type: getNetworkType()
          },
          contentType,
          content: inscriptionContent,
          payloadType,
          
        },
        onFinish: (response: CreateInscriptionResponse) => {
          console.log('Inscription created:', response);
          alert(`Ordinal created successfully! Transaction ID: ${response.txId}`);
          addNewOrdinal(response.txId, inscriptionContent, contentType);
        },
        onCancel: () => {
          console.log('Inscription creation was canceled');
          alert('Inscription creation was canceled');
        },
      };

      console.log('Calling createInscription with options:', createInscriptionOptions);
      await createInscription(createInscriptionOptions);

    } catch (error) {
      console.error('Error creating ordinal:', error);
      alert(`Failed to create ordinal: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsArrayBuffer(file);
      reader.onload = () => {
        const arrayBuffer = reader.result as ArrayBuffer;
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const addNewOrdinal = (txid: string, inscriptionContent: string, contentType: string) => {
    const newOrdinal: CreatedOrdinal = {
      id: txid,
      contentType: contentType,
      content: inscriptionContent,
      status: 'created',
      timestamp: new Date().toISOString(),
    };

    setCreatedOrdinals(prevOrdinals => [...prevOrdinals, newOrdinal]);
  };

  useEffect(() => {
    if (publicKey) {
      setOrdinals([]);
      setCurrentOffset(0);
      setHasMoreOrdinals(true);
      setHasPermission(false); // Reset permission state when public key changes
      fetchWalletOrdinals(0);
    }
  }, [publicKey, isTestnet]);
  
  // Update the toggleNetwork function to clear ordinals when switching networks
  const toggleNetwork = () => {
    setIsTestnet(!isTestnet);
    setWalletConnected(false);
    setPublicKey(null);
    setConfirmedBalance(null);
    setUnconfirmedBalance(null);
    setOrdinals([]); // Clear the ordinals when switching networks
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 text-white p-8"
    >
      <div className="max-w-4xl mx-auto">
        <motion.h1
          initial={{ y: -50 }}
          animate={{ y: 0 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="text-5xl font-extrabold text-center mb-10 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500"
        >
          Bitcoin Ordinal Creator
        </motion.h1>

        <motion.div
          className="bg-gray-800 rounded-xl p-8 shadow-lg backdrop-blur-sm bg-opacity-30 border border-gray-700"
          whileHover={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Create Bitcoin Ordinal</h2>
            <Switch
              checked={!isTestnet}
              onChange={() => toggleNetwork()}
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

          <p className="text-sm text-gray-300 mb-4">
            Current network: {isTestnet ? 'Testnet' : 'Mainnet'}
          </p>

          {!walletConnected ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full py-2 px-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-md text-white font-semibold shadow-lg hover:from-blue-600 hover:to-purple-700 transition duration-300"
              onClick={connectWallet}
            >
              Connect Wallet
            </motion.button>
          ) : (
            <div className="mb-6 p-4 bg-gray-700 rounded-lg">
              <p className="text-sm mb-2">Wallet Connected:</p>
              <p className="text-xs text-gray-300 break-all">{publicKey}</p>
              <div className="mt-2 flex justify-between">
                <div>
                  <p className="text-sm">Confirmed Balance:</p>
                  <p className="text-lg font-bold text-green-400">
                    {confirmedBalance !== null ? `${confirmedBalance} satoshis` : 'Loading...'}
                  </p>
                </div>
                <div>
                  <p className="text-sm">Unconfirmed Balance:</p>
                  <p className="text-lg font-bold text-yellow-400">
                    {unconfirmedBalance !== null ? `${unconfirmedBalance} satoshis` : 'Loading...'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-300 mb-2">
                Ordinal Content (Text)
              </label>
              <textarea
                id="content"
                value={content}
                onChange={handleContentChange}
                className="w-full px-3 py-2 text-gray-300 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter text content for your ordinal"
                rows={4}
              />
            </div>
            <div>
              <label htmlFor="file" className="block text-sm font-medium text-gray-300 mb-2">
                Upload Image
              </label>
              <input
                id="file"
                type="file"
                onChange={handleFileChange}
                className="w-full px-3 py-2 text-gray-300 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                accept="image/*"
              />
            </div>
            {preview && (
              <div>
                <img src={preview} alt="Preview" className="mt-2 max-w-full h-auto rounded-md" />
              </div>
            )}
            <motion.button
              type="submit"
              className="w-full py-2 px-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-md text-white font-semibold shadow-lg hover:from-purple-600 hover:to-pink-600 transition duration-300"
              disabled={isLoading || !walletConnected}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isLoading ? 'Creating...' : 'Create Ordinal'}
            </motion.button>
          </form>
        </motion.div>

        <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-12"
      >
        <h3 className="text-2xl font-bold mb-4">Wallet Ordinals ({isTestnet ? 'Testnet' : 'Mainnet'})</h3>
        <p>Total Inscriptions: {totalInscriptions}</p>
        {isLoadingOrdinals && ordinals.length === 0 ? (
          <p>Loading wallet ordinals...</p>
        ) : ordinals.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ordinals.map((ordinal) => (
                <motion.div
                  key={ordinal.inscriptionId}
                  className="bg-gray-800 rounded-lg p-4 shadow-md"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <img 
                    src={'https://ord-testnet.xverse.app/content/' + ordinal.inscriptionId} 
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
            {hasMoreOrdinals && (
              <button 
                onClick={loadMoreOrdinals}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                disabled={isLoadingOrdinals}
              >
                {isLoadingOrdinals ? 'Loading...' : 'Load More'}
              </button>
            )}
          </>
        ) : (
          <p>No ordinals found in this wallet on {isTestnet ? 'testnet' : 'mainnet'}.</p>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-12"
      >
        <h3 className="text-2xl font-bold mb-4">Created Ordinals</h3>
        <div className="space-y-4">
          {createdOrdinals.map((ordinal) => (
            <motion.div
              key={ordinal.id}
              className="bg-gray-800 rounded-lg p-4 shadow-md"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <p><strong>Transaction ID:</strong> {ordinal.id}</p>
              <p><strong>Content Type:</strong> {ordinal.contentType}</p>
              <p><strong>Status:</strong> {ordinal.status}</p>
              <p><strong>Timestamp:</strong> {new Date(ordinal.timestamp).toLocaleString()}</p>
              {ordinal.contentType.startsWith('image/') ? (
                <img 
                  src={`data:${ordinal.contentType};base64,${ordinal.content}`} 
                  alt="Ordinal" 
                  className="mt-2 max-w-full h-auto rounded-md" 
                />
              ) : (
                <p><strong>Content:</strong> {ordinal.content.slice(0, 100)}...</p>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>
      </div>
    </motion.div>
  );
};

export default OrdinalCreator;
