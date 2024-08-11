import React, { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Textarea } from './components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from './components/ui/card';
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
    if (balance === null || balance === 0) {
      alert('Your balance is insufficient to create an ordinal. Please add funds to your address.');
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
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Create Bitcoin Ordinal</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Button onClick={toggleNetwork} className="w-full mb-2">
            Switch to {isTestnet ? 'Mainnet' : 'Testnet'}
          </Button>
          <p>Current network: {isTestnet ? 'Testnet' : 'Mainnet'}</p>
        </div>
        {!walletConnected ? (
          <Button onClick={connectWallet} className="w-full mb-4">
            Connect Wallet
          </Button>
        ) : (
          <div className="mb-4">
            <p>Wallet Connected: {publicKey}</p>
            <p>Confirmed Balance: {confirmedBalance !== null ? `${confirmedBalance} satoshis` : 'Loading...'}</p>
            <p>Unconfirmed Balance: {unconfirmedBalance !== null ? `${unconfirmedBalance} satoshis` : 'Loading...'}</p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700">
              Ordinal Content (Text)
            </label>
            <Textarea
              id="content"
              value={content}
              onChange={handleContentChange}
              className="mt-1"
              placeholder="Enter text content for your ordinal"
            />
          </div>
          <div>
            <label htmlFor="file" className="block text-sm font-medium text-gray-700">
              Upload Image
            </label>
            <Input
              id="file"
              type="file"
              onChange={handleFileChange}
              className="mt-1"
              accept="image/*"
            />
          </div>
          {preview && (
            <div>
              <img src={preview} alt="Preview" className="mt-2 max-w-full h-auto" />
            </div>
          )}
          <Button type="submit" className="w-full" disabled={isLoading || !walletConnected}>
            {isLoading ? 'Creating...' : 'Create Ordinal'}
          </Button>
          </form>
        
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-2">Created Ordinals</h3>
          {ordinals.map((ordinal) => (
            <div key={ordinal.id} className="border p-2 mb-2 rounded">
              <p><strong>ID:</strong> {ordinal.id}</p>
              <p><strong>Content:</strong> {ordinal.content}</p>
              <p><strong>File Type:</strong> {ordinal.fileType}</p>
              <p><strong>Status:</strong> {ordinal.status}</p>
              <p><strong>Timestamp:</strong> {ordinal.timestamp}</p>
              {ordinal.txid && <p><strong>Transaction ID:</strong> {ordinal.txid}</p>}
              {ordinal.fileData && ordinal.fileType.startsWith('image/') && (
                <img src={ordinal.fileData} alt="Ordinal" className="mt-2 max-w-full h-auto" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default OrdinalCreator;
