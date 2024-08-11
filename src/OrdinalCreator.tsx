import React, { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Switch } from '@headlessui/react';
import { AddressPurpose, BitcoinNetworkType, getAddress, GetAddressOptions, signTransaction, SignTransactionOptions } from 'sats-connect';
import axios from 'axios';

interface Ordinal {
  id: string;
  content: string;
  fileType: string;
  fileData: string | null;
  status: string;
  timestamp: string;
  txid?: string;
}

const OrdinalCreator: React.FC = () => {
  const [content, setContent] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [ordinals, setOrdinals] = useState<Ordinal[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [walletConnected, setWalletConnected] = useState<boolean>(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [isTestnet, setIsTestnet] = useState<boolean>(true);
  const [confirmedBalance, setConfirmedBalance] = useState<number | null>(null);
  const [unconfirmedBalance, setUnconfirmedBalance] = useState<number | null>(null);

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
      setBalance(totalBalance);  // Update the balance state with the total balance
    } catch (error) {
      console.error('Error fetching balance:', error);
      setConfirmedBalance(null);
      setUnconfirmedBalance(null);
      setBalance(null);  // Also set balance to null in case of an error
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
        onFinish: (response: { addresses: { address: string; }[]; }) => {
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
    console.log(`Balance: ${balance}`)
    if (confirmedBalance === null || confirmedBalance === 0) {
      alert('Your confirmed balance is insufficient to create an ordinal. Please add funds to your address and wait for confirmation.');
      return;
    }
    setIsLoading(true);

    try {
      const ordinalData = {
        content: content,
        fileType: file ? file.type : 'text/plain',
        fileData: file ? await fileToBase64(file) : null,
      };

      const txResponse = await fetch('http://localhost:3002/api/prepare-ordinal-tx', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...ordinalData,
          address: publicKey,
          isTestnet: isTestnet,  
        }),
      });

      if (!txResponse.ok) {
        throw new Error('Failed to prepare ordinal transaction');
      }

      const txDetails = await txResponse.json();
      console.log('Received PSBT from backend:', txDetails.psbt);

      const signPsbtOptions: SignTransactionOptions = {
        payload: {
          network: {
            type: getNetworkType()
          },
          message: 'Sign transaction to create Bitcoin Ordinal',
          psbtBase64: txDetails.psbt,
          broadcast: false,
          inputsToSign: [
            {
              address: publicKey,
              signingIndexes: [0],
            },
          ],
        },
        onFinish: (response: { psbtBase64: string; }) => {
          console.log('Signed transaction:', response);
          broadcastTransaction(response.psbtBase64);
        },
        onCancel: () => {
          throw new Error('Transaction signing was canceled');
        },
      };

      await signTransaction(signPsbtOptions);

    } catch (error) {
      console.error('Error creating ordinal:', error);
      alert(`Failed to create ordinal: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const broadcastTransaction = async (signedPsbtBase64: string) => {
    const broadcastResponse = await fetch('http://localhost:3002/api/broadcast-tx', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ signedTx: signedPsbtBase64, isTestnet: isTestnet }),
    });

    if (!broadcastResponse.ok) {
      throw new Error('Failed to broadcast transaction');
    }

    const broadcastResult = await broadcastResponse.json();

    const newOrdinal: Ordinal = {
      id: broadcastResult.txid,
      content: content,
      fileType: file ? file.type : 'text/plain',
      fileData: file ? await fileToBase64(file) : null,
      status: 'broadcasted',
      timestamp: new Date().toISOString(),
      txid: broadcastResult.txid,
    };

    setOrdinals([...ordinals, newOrdinal]);

    setContent('');
    setFile(null);
    setPreview('');

    alert(`Ordinal created successfully! Transaction ID: ${broadcastResult.txid}`);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const toggleNetwork = () => {
    setIsTestnet(!isTestnet);
    setWalletConnected(false);
    setPublicKey(null);
    setBalance(null);
    setConfirmedBalance(null);
    setUnconfirmedBalance(null);
    // If a wallet is connected, check the balance for the new network
    if (publicKey) {
      checkBalance(publicKey);
    }
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
          <h3 className="text-2xl font-bold mb-4">Created Ordinals</h3>
          <div className="space-y-4">
            {ordinals.map((ordinal) => (
              <motion.div
                key={ordinal.id}
                className="bg-gray-800 rounded-lg p-4 shadow-md"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <p><strong>ID:</strong> {ordinal.id}</p>
                <p><strong>Content:</strong> {ordinal.content}</p>
                <p><strong>File Type:</strong> {ordinal.fileType}</p>
                <p><strong>Status:</strong> {ordinal.status}</p>
                <p><strong>Timestamp:</strong> {ordinal.timestamp}</p>
                {ordinal.txid && <p><strong>Transaction ID:</strong> {ordinal.txid}</p>}
                {ordinal.fileData && ordinal.fileType.startsWith('image/') && (
                  <img src={ordinal.fileData} alt="Ordinal" className="mt-2 max-w-full h-auto rounded-md" />
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
