import {
  ChainId,
  CHAIN_ID_AVAX,
  CHAIN_ID_ETH,
  coalesceChainName,
  CONTRACTS,
} from "@certusone/wormhole-sdk";
import avaxIcon from "../icons/avax.svg";
import ethIcon from "../icons/eth.svg";

export interface ChainInfo {
  id: ChainId;
  name: string;
  logo: string;
}
export const CHAINS: ChainInfo[] = [
  {
    id: CHAIN_ID_AVAX,
    name: "Avalanche",
    logo: avaxIcon,
  },
  {
    id: CHAIN_ID_ETH,
    name: "Ethereum (Goerli)",
    logo: ethIcon,
  },
];
export type ChainsById = { [key in ChainId]: ChainInfo };
export const CHAINS_BY_ID: ChainsById = CHAINS.reduce((obj, chain) => {
  obj[chain.id] = chain;
  return obj;
}, {} as ChainsById);

export const getExplorerName = (chainId: ChainId) =>
  chainId === CHAIN_ID_ETH
    ? "Etherscan"
    : chainId === CHAIN_ID_AVAX
    ? "Snowtrace"
    : "Explorer";
export const WORMHOLE_RPC_HOSTS = [
  "https://wormhole-v2-testnet-api.certus.one",
];
export const ETH_NETWORK_CHAIN_ID = 5;
export const AVAX_NETWORK_CHAIN_ID = 43113;
export const getEvmChainId = (chainId: ChainId) =>
  chainId === CHAIN_ID_ETH
    ? ETH_NETWORK_CHAIN_ID
    : chainId === CHAIN_ID_AVAX
    ? AVAX_NETWORK_CHAIN_ID
    : undefined;

export const getBridgeAddressForChain = (chainId: ChainId) =>
  CONTRACTS["TESTNET"][coalesceChainName(chainId)].core || "";
