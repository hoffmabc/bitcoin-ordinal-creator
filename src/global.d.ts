interface XverseBitcoinProvider {
  connect: () => Promise<void>;
  createInscription: (params: any) => Promise<any>;
  createRepeatingInscriptions: (params: any) => Promise<any>;
  request: (method: string, params?: any) => Promise<any>;
  sendBtcTransaction: (params: any) => Promise<any>;
  signMessage: (params: any) => Promise<any>;
  signMultipleTransactions: (params: any) => Promise<any>;
  signTransaction: (params: any) => Promise<any>;
}

interface Window {
  XverseProviders?: {
    BitcoinProvider: XverseBitcoinProvider;
  };
  btc?: {
    request: (method: string, params?: any) => Promise<any>;
  };
}