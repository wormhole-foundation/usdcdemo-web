import {
  approveEth,
  ChainId,
  CHAIN_ID_KLAYTN,
  getAllowanceEth,
  isEVMChain,
} from "@certusone/wormhole-sdk";
import { BigNumber } from "ethers";
import { useEffect, useMemo, useState } from "react";
import { useEthereumProvider } from "../contexts/EthereumProviderContext";

export default function useAllowance(
  chainId: ChainId,
  tokenAddress?: string,
  transferAmount?: BigInt,
  sourceIsNative?: boolean,
  overrideAddress?: string
) {
  const [allowance, setAllowance] = useState<BigInt | null>(null);
  const [isAllowanceFetching, setIsAllowanceFetching] = useState(false);
  const [isApproveProcessing, setIsApproving] = useState<boolean>(false);
  const { signer } = useEthereumProvider();
  const sufficientAllowance =
    !isEVMChain(chainId) ||
    sourceIsNative ||
    (allowance && transferAmount && allowance >= transferAmount);

  useEffect(() => {
    let cancelled = false;
    if (
      isEVMChain(chainId) &&
      tokenAddress &&
      signer &&
      overrideAddress &&
      !isApproveProcessing
    ) {
      setIsAllowanceFetching(true);
      getAllowanceEth(overrideAddress, tokenAddress, signer).then(
        (result) => {
          if (!cancelled) {
            setIsAllowanceFetching(false);
            setAllowance(result.toBigInt());
          }
        },
        (error) => {
          if (!cancelled) {
            setIsAllowanceFetching(false);
            //setError("Unable to retrieve allowance"); //TODO set an error
          }
        }
      );
    }

    return () => {
      cancelled = true;
    };
  }, [chainId, tokenAddress, signer, isApproveProcessing, overrideAddress]);

  const approveAmount: (amount: BigInt) => Promise<any> = useMemo(() => {
    return !isEVMChain(chainId) || !tokenAddress || !signer || !overrideAddress
      ? (amount: BigInt) => {
          return Promise.resolve();
        }
      : (amount: BigInt) => {
          setIsApproving(true);
          // Klaytn requires specifying gasPrice
          const gasPricePromise =
            chainId === CHAIN_ID_KLAYTN
              ? signer.getGasPrice()
              : Promise.resolve(undefined);
          return gasPricePromise.then(
            (gasPrice) =>
              approveEth(
                overrideAddress,
                tokenAddress,
                signer,
                BigNumber.from(amount),
                gasPrice === undefined ? {} : { gasPrice }
              ).then(
                () => {
                  setIsApproving(false);
                  return Promise.resolve();
                },
                () => {
                  setIsApproving(false);
                  return Promise.reject();
                }
              ),
            () => {
              setIsApproving(false);
              return Promise.reject();
            }
          );
        };
  }, [chainId, tokenAddress, signer, overrideAddress]);

  return useMemo(
    () => ({
      sufficientAllowance,
      approveAmount,
      isAllowanceFetching,
      isApproveProcessing,
    }),
    [
      sufficientAllowance,
      approveAmount,
      isAllowanceFetching,
      isApproveProcessing,
    ]
  );
}
