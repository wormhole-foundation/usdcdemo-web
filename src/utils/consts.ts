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

export const EVM_POLYGON_NETWORK_CHAIN_ID = 80001;
export const EVM_ETH_NETWORK_CHAIN_ID = 5;
export const EVM_AVAX_NETWORK_CHAIN_ID = 43113;
export const EVM_BSC_NETWORK_CHAIN_ID = 97;

// circle integration
export const CIRCLE_INTEGRATION_ADDRESS_ETHEREUM =
  "0xbdCc4eBE3157df347671e078a41eE5Ce137Cd306";

export const CIRCLE_INTEGRATION_ADDRESS_AVALANCHE =
  "0xb200977d46aea35ce6368d181534f413570a0f54";

// gas
export const APPROVAL_GAS_LIMIT = "100000";

export interface TokenInfo {
  name: string;
  chainName: string;
  address: string;
  chainId: ChainId;
  evmChainId: number | undefined;
  logo: string;
  maxAmount: number;
  usdcPairedAddress: string | undefined;
}

export const ETH_TOKEN_INFO: TokenInfo = {
  name: "ETH",
  chainName: "Ethereum (Goerli)",
  address: "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6",
  chainId: CHAIN_ID_ETH,
  evmChainId: EVM_ETH_NETWORK_CHAIN_ID,
  logo: ethIcon,
  maxAmount: 0.0001,
  usdcPairedAddress: "0x07865c6E87B9F70255377e024ace6630C1Eaa37F",
};

export const AVAX_TOKEN_INFO: TokenInfo = {
  name: "AVAX",
  chainName: "Avalanche",
  address: "0xd00ae08403B9bbb9124bB305C09058E32C39A48c",
  chainId: CHAIN_ID_AVAX,
  evmChainId: EVM_AVAX_NETWORK_CHAIN_ID,
  logo: avaxIcon,
  maxAmount: 0.01,
  usdcPairedAddress: "0x5425890298aed601595a70AB815c96711a31Bc65",
};

export const ETH_SWAP_CONTRACT_ADDRESS =
  "0x0b9609021Fa0683D49a01B7CafC1242eCcfCC561";

export const AVAX_SWAP_CONTRACT_ADDRESS =
  "0x4F367FA8D45BB782337Ae07e4f11E1b48b116217";

export const ETH_CIRCLE_EMITTER_ADDRESS =
  "0x26413e8157CD32011E726065a5462e97dD4d03D9";

export const AVAX_CIRCLE_EMITTER_ADDRESS =
  "0xa9fB1b3009DCb79E2fe346c16a604B8Fa8aE0a79";

export const TOKEN_INFOS = [ETH_TOKEN_INFO, AVAX_TOKEN_INFO];

export const getSupportedSwaps = (tokenInfo: TokenInfo) => {
  return TOKEN_INFOS.filter((x) => x !== tokenInfo);
};
