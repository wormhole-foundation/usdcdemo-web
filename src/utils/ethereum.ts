import { ChainId, ethers_contracts } from "@certusone/wormhole-sdk";
import { ethers } from "ethers";
import { formatUnits, hexStripZeros, hexlify } from "ethers/lib/utils";
import { getEvmChainId } from "./consts";

export interface ParsedTokenAccount {
  publicKey: string;
  mintKey: string;
  amount: string;
  decimals: number;
  uiAmount: number;
  uiAmountString: string;
  symbol?: string;
  name?: string;
  logo?: string;
  isNativeAsset?: boolean;
}

export function createParsedTokenAccount(
  publicKey: string,
  mintKey: string,
  amount: string,
  decimals: number,
  uiAmount: number,
  uiAmountString: string,
  symbol?: string,
  name?: string,
  logo?: string,
  isNativeAsset?: boolean
): ParsedTokenAccount {
  return {
    publicKey: publicKey,
    mintKey: mintKey,
    amount,
    decimals,
    uiAmount,
    uiAmountString,
    symbol,
    name,
    logo,
    isNativeAsset,
  };
}

//This is a valuable intermediate step to the parsed token account, as the token has metadata information on it.
export async function getEthereumToken(
  tokenAddress: string,
  provider: ethers.providers.Web3Provider | ethers.providers.JsonRpcProvider
) {
  const token = ethers_contracts.TokenImplementation__factory.connect(
    tokenAddress,
    provider
  );
  return token;
}

export async function ethTokenToParsedTokenAccount(
  token: ethers_contracts.TokenImplementation,
  signerAddress: string
) {
  const decimals = await token.decimals();
  const balance = await token.balanceOf(signerAddress);
  const symbol = await token.symbol();
  const name = await token.name();
  return createParsedTokenAccount(
    signerAddress,
    token.address,
    balance.toString(),
    decimals,
    Number(formatUnits(balance, decimals)),
    formatUnits(balance, decimals),
    symbol,
    name
  );
}

export async function switchEvmProviderNetwork(
  provider: ethers.providers.Web3Provider,
  chainId: ChainId
) {
  const evmChainId = getEvmChainId(chainId);
  if (evmChainId === undefined) {
    throw new Error("Unknown chainId");
  }
  try {
    await provider.send("wallet_switchEthereumChain", [
      { chainId: hexStripZeros(hexlify(evmChainId)) },
    ]);
  } catch {}
  //const network = await provider.getNetwork();
  //if (network.chainId !== evmChainId) {
  //  throw new Error("Could not switch network");
  //}
}
