import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import '@rainbow-me/rainbowkit/styles.css';
import {
  getDefaultWallets,
  RainbowKitProvider,
  ConnectButton
} from '@rainbow-me/rainbowkit';
import {
  configureChains,
  createClient,
  WagmiConfig,
  useAccount,
  useBalance
} from 'wagmi';
import { publicProvider } from 'wagmi/providers/public';

const base = {
  id: 8453,
  name: 'Base',
  network: 'base',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://mainnet.base.org'] },
    public: { http: ['https://mainnet.base.org'] },
  },
  blockExplorers: {
    default: { name: 'Basescan', url: 'https://basescan.org' },
  },
};

const KARTEL = "0xC680eca227FC9AB21A9210E0EaFEff9068a89327";
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const PESO = "0x1423569894d749AdE3f2b677Ea6220e2366E7AaC";
const LP = "0x24e8f008519c7a9cc414e21a19aba500c6c5fe46";
const TREASURY = "0xF08a91c214c42a0F51DE0C5691FDf6Fa37e6E1f2";

const { chains, provider } = configureChains([base], [publicProvider()]);
const { connectors } = getDefaultWallets({
  appName: 'Kartel Exchange',
  projectId: 'c15464b8daf8151f93cd366810034e5b',
  chains
});
const wagmiClient = createClient({ autoConnect: true, connectors, provider });

const Dashboard = () => {
  const { address, isConnected } = useAccount();
  const [prices, setPrices] = useState({ KARTEL: 0.0, PESO: 0.05, USDC: 1 });
  const [pesoSupply, setPesoSupply] = useState(0);

  const kartel = useBalance({ address, token: KARTEL });
  const usdcPeso = useBalance({ address: PESO, token: USDC });
  const peso = useBalance({ address, token: PESO });
  const lp = useBalance({ address, token: LP });

  const kartelT = useBalance({ address: TREASURY, token: KARTEL });
  const usdcT = useBalance({ address: TREASURY, token: USDC });
  const pesoT = useBalance({ address: TREASURY, token: PESO });
  const lpT = useBalance({ address: TREASURY, token: LP });

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch("https://api.dexscreener.com/latest/dex/pairs/base/0x5e7dc4b68105b561e2397b7395fcbbe2a1fd29fe");
        const data = await res.json();
        const price = parseFloat(data.pair?.priceUsd || 0);
        setPrices({ KARTEL: price, PESO: 0.05, USDC: 1 });
      } catch (err) {
        console.error("Failed to fetch price:", err);
      }
    };

    const fetchStats = async () => {
      const apiKey = import.meta.env.VITE_BASESCAN_API_KEY;
      try {
        const pesoRes = await fetch(`https://api.basescan.org/api?module=stats&action=tokensupply&contractaddress=${PESO}&apikey=${apiKey}`);
        const pesoJson = await pesoRes.json();
        setPesoSupply(Number(pesoJson.result) / 1e18);
      } catch (err) {
        console.error("Failed to fetch BaseScan stats", err);
      }
    };

    fetchPrices();
    fetchStats();
    const interval = setInterval(() => {
      fetchPrices();
      fetchStats();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatUsdDisplay = (val) =>
    isNaN(val) ? '...' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  const parsedUSDC = Number(usdcPeso.data?.formatted || 0); // USDC in PESO contract
  const parsedUSDC_T = Number(usdcT.data?.formatted || 0); // USDC in TREASURY wallet
  const parsedPESO_T = Number(pesoT.data?.formatted || 0);
  const parsedKARTEL_T = Number(kartelT.data?.formatted || 0);

  const combinedUSDC = parsedUSDC + parsedUSDC_T;
  const treasuryValue = combinedUSDC + parsedPESO_T * 0.05 + parsedKARTEL_T * prices.KARTEL;
  const pesoBackingRatio = pesoSupply > 0
  ? ((parsedUSDC + parsedUSDC_T) / (pesoSupply * 0.05)) * 100
  : 0;

console.log('USDC in treasury:', parsedUSDC_T);
console.log('PESO supply:', pesoSupply);
console.log('Denominator (pesoSupply * 0.05):', pesoSupply * 0.05);
console.log('Backing Ratio:', pesoBackingRatio);

  return (
    <div className="min-h-screen text-white p-6 flex flex-col items-center" style={{
      backgroundColor: '#2c2c2c',
      backgroundImage: "url('/entry-desert-suvs.png')",
      backgroundSize: 'cover',
      backgroundPosition: 'center'
    }}>
      <div className="flex flex-col items-center mb-6">
        <img src="/dashboard-logo.png" alt="KARTEL" className="w-[20rem] mb-4 border-4 border-black rounded" />
        <ConnectButton label="Connect Wallet" chainStatus="none" showBalance={false} />
        {isConnected && (
          <div className="mt-2 bg-gray-800 px-4 py-2 rounded text-sm border border-gray-600">{address}</div>
        )}
      </div>

      <div className="w-full max-w-3xl space-y-6">
        <div className="bg-gray-900 p-4 rounded border border-gray-700 text-center">
          <h2 className="text-xl font-bold mb-4">BALANCES</h2>
          <p>KARTEL: {kartel.data?.formatted} ({formatUsdDisplay(Number(kartel.data?.formatted) * prices.KARTEL)})</p>
          <p>USDC: {(parsedUSDC + parsedUSDC_T).toLocaleString()} ({formatUsdDisplay(parsedUSDC + parsedUSDC_T)})</p>
          <p>PESO: {peso.data?.formatted} ({formatUsdDisplay(Number(peso.data?.formatted) * 0.05)})</p>
          <p>PESO/USDC V2 LP: 0.00</p>
          <p>KARTEL/WETH V2 LP: 0.00</p>
        </div>

        <div className="bg-gray-900 p-4 rounded border border-gray-700 text-center">
          <h2 className="text-2xl font-bold mb-4">STAKE YOUR LPs FOR $KARTEL</h2>
          {[{
            name: 'PESO/USDC V2',
            address: '0xbbC2789F3B85D4Fdb27E4e65132dA1fE4E20e738'
          }, {
            name: 'KARTEL/WETH V2',
            address: '0xEA773ca13B95B87eA3d50D3E8A4BCB5856464aEC'
          }].map(pool => (
            <div key={pool.address} className="border border-gray-600 p-4 rounded bg-gray-800 space-y-2">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold">{pool.name}</h3>
                  <p className="text-sm text-gray-400">LP Address: <span className="break-all">{pool.address}</span></p>
                </div>
                <div className="flex flex-col md:flex-row md:items-center gap-2 w-full md:w-auto">
                  <div className="flex gap-2 items-center w-full md:w-48">
                    <input
                      type="number"
                      placeholder="Amount"
                      className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-sm"
                    />
                    <button className="text-xs px-2 py-1 bg-gray-600 rounded hover:bg-gray-500">MAX</button>
                  </div>
                  <button className="bg-green-700 hover:bg-green-800 px-4 py-2 rounded text-white text-sm">Stake</button>
                  <button className="bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded text-white text-sm">Unstake</button>
                                  </div>
              </div>
              <a
                href={`https://dex.kartel.exchange/add/${pool.name.replace(/\s/g, '').replace('V2', '').replace('/', '-')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded text-white text-sm mt-2"
              >
                Get LP
              </a>
              <div className="text-sm text-gray-300 pl-1 pt-2 space-y-1">
                <p>📥 Your Staked LP: <span className="font-semibold text-white">0.00</span> <span className="text-gray-400">($0.00)</span></p>
                <div className="flex flex-col items-center justify-center text-center">
  <p>💰 Claimable $KARTEL: <span className="font-semibold text-white">0.00</span> <span className="text-gray-400">($0.00)</span></p>
  <button className="bg-blue-600 hover:bg-blue-700 px-4 py-1 rounded text-white text-sm mt-2">Claim</button>
</div>
<p>📈 Est. Daily Rewards: <span className="font-semibold text-white">0.00</span> $KARTEL <span className="text-gray-400">($0.00/day)</span></p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-gray-900 p-4 rounded border border-gray-700 text-center">
          <h2 className="text-xl font-bold mb-4">TREASURY {TREASURY}</h2>
          <p className="mb-2 text-lg font-semibold text-green-400">
            TREASURY TOTAL VALUE: {formatUsdDisplay(treasuryValue)}
          </p>
          <p>TREASURY VALUE (LP): {lpT.data?.formatted}</p>
          <p>KARTEL: {kartelT.data?.formatted} ({formatUsdDisplay(parsedKARTEL_T * prices.KARTEL)})</p>
          <p>USDC: {(parsedUSDC + parsedUSDC_T).toLocaleString()} ({formatUsdDisplay(parsedUSDC + parsedUSDC_T)})</p>
          <p>PESO: {pesoT.data?.formatted} ({formatUsdDisplay(parsedPESO_T * 0.05)})</p>
          <p className="mt-4">PESOS MINTED: {pesoSupply.toLocaleString()}</p>
          <p>PESO BACKING RATIO: {pesoSupply > 0 ? pesoBackingRatio.toFixed(2) + '%' : '...'}</p>
        </div>
      </div>
    </div>
  );
};

const App = () => (
  <WagmiConfig client={wagmiClient}>
    <RainbowKitProvider chains={chains}>
      <Dashboard />
    </RainbowKitProvider>
  </WagmiConfig>
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
);
