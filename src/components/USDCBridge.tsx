import {
  ChainId,
  CHAIN_ID_AVAX,
  CHAIN_ID_ETH,
  getEmitterAddressEth,
  getSignedVAAWithRetry,
  isEVMChain,
  keccak256,
  parseSequenceFromLogEth,
  parseVaa,
  tryUint8ArrayToNative,
  uint8ArrayToHex,
} from "@certusone/wormhole-sdk";
import {
  Box,
  Container,
  FormControlLabel,
  FormGroup,
  Slider,
  Step,
  StepLabel,
  Stepper,
  Switch,
  Typography,
} from "@mui/material";
import axios, { AxiosResponse } from "axios";
import { constants, Contract, ethers } from "ethers";
import {
  arrayify,
  formatUnits,
  hexlify,
  hexZeroPad,
  parseUnits,
} from "ethers/lib/utils";
import type { PageProps } from "gatsby";
import * as React from "react";
import Layout from "../components/Layout";
import { SEO } from "../components/SEO";
// import { useSnackbar } from "notistack";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";
import ButtonWithLoader from "../components/ButtonWithLoader";
import ChainSelectArrow from "../components/ChainSelectArrow";
import KeyAndBalance from "../components/KeyAndBalance";
import NumberTextField from "../components/NumberTextField";
import {
  EthereumProviderProvider,
  useEthereumProvider,
} from "../contexts/EthereumProviderContext";
import useAllowance from "../hooks/useAllowance";
import useIsWalletReady from "../hooks/useIsWalletReady";
import {
  AVAX_CIRCLE_EMITTER_ADDRESS,
  CHAINS_BY_ID,
  CIRCLE_INTEGRATION_ADDRESS_AVALANCHE,
  CIRCLE_INTEGRATION_ADDRESS_ETHEREUM,
  ETH_CIRCLE_EMITTER_ADDRESS,
  getBridgeAddressForChain,
  getEvmChainId,
  WORMHOLE_RPC_HOSTS,
} from "../utils/consts";
import {
  ethTokenToParsedTokenAccount,
  getEthereumToken,
  ParsedTokenAccount,
  switchEvmProviderNetwork,
} from "../utils/ethereum";
import {
  EVM_RPC_MAP,
  METAMASK_CHAIN_PARAMETERS,
} from "../utils/metaMaskChainParameters";
import { handleCircleMessageInLogs, sleep } from "../utils/circle";
import ErrorIcon from "@mui/icons-material/Error";

// Ported from example-token-bridge-ui

const infoContainer = {
  display: "flex",
  textAlign: "left",
  mt: 2,
  mb: 1,
  mx: 0,
};

// const USDC_CHAINS = CHAINS.filter(
//   (c) => c.id === CHAIN_ID_ETH || c.id === CHAIN_ID_AVAX
// );

const USDC_DECIMALS = 6;
const USDC_ADDRESSES: { [key in ChainId]?: string } = {
  [CHAIN_ID_ETH]: "0x07865c6E87B9F70255377e024ace6630C1Eaa37F",
  [CHAIN_ID_AVAX]: "0x5425890298aed601595a70AB815c96711a31Bc65",
};
const CIRCLE_BRIDGE_ADDRESSES: { [key in ChainId]?: string } = {
  [CHAIN_ID_ETH]: "0xdAbec94B97F7b5FCA28f050cC8EeAc2Dc9920476",
  [CHAIN_ID_AVAX]: "0x0fC1103927AF27aF808D03135214718bCEDbE9ad",
};
const CIRCLE_EMITTER_ADDRESSES: { [key in ChainId]?: string } = {
  [CHAIN_ID_ETH]: ETH_CIRCLE_EMITTER_ADDRESS,
  [CHAIN_ID_AVAX]: AVAX_CIRCLE_EMITTER_ADDRESS,
};
const CIRCLE_DOMAINS: { [key in ChainId]?: number } = {
  [CHAIN_ID_ETH]: 0,
  [CHAIN_ID_AVAX]: 1,
};
const CIRCLE_DOMAIN_TO_WORMHOLE_CHAIN: { [key in number]: ChainId } = {
  0: CHAIN_ID_ETH,
  1: CHAIN_ID_AVAX,
};
const USDC_RELAYER: { [key in ChainId]?: string } = {
  [CHAIN_ID_ETH]: "0xC0a4e16a5B1e7342EF9c2837F4c94cB66A91601C",
  [CHAIN_ID_AVAX]: "0xfC6d1D7A5a511F9555Fc013a296Ed47c9C297fB3",
};
const USDC_WH_INTEGRATION: { [key in ChainId]?: string } = {
  [CHAIN_ID_ETH]: CIRCLE_INTEGRATION_ADDRESS_ETHEREUM,
  [CHAIN_ID_AVAX]: CIRCLE_INTEGRATION_ADDRESS_AVALANCHE,
};
const USDC_WH_EMITTER: { [key in ChainId]?: string } = {
  [CHAIN_ID_ETH]: getEmitterAddressEth(USDC_WH_INTEGRATION[CHAIN_ID_ETH] || ""),
  [CHAIN_ID_AVAX]: getEmitterAddressEth(
    USDC_WH_INTEGRATION[CHAIN_ID_AVAX] || ""
  ),
};

type State = {
  sourceChain: ChainId;
  targetChain: ChainId;
};

function USDCBridge() {
  const classes: any = {};
  // TODO: move to state with safety for switching
  const [{ sourceChain, targetChain }, setState] = useState<State>({
    sourceChain: CHAIN_ID_ETH,
    targetChain: CHAIN_ID_AVAX,
  });
  const sourceContract = CIRCLE_BRIDGE_ADDRESSES[sourceChain];
  const sourceRelayContract = USDC_RELAYER[sourceChain];
  const sourceRelayEmitter = USDC_WH_EMITTER[sourceChain];
  const sourceAsset = USDC_ADDRESSES[sourceChain];
  const targetContract = CIRCLE_EMITTER_ADDRESSES[targetChain];
  const targetRelayContract = USDC_RELAYER[targetChain];
  const targetCircleIntegrationContract = USDC_WH_INTEGRATION[targetChain];
  const targetAsset = USDC_ADDRESSES[targetChain];
  const [balance, setBalance] = useState<ParsedTokenAccount | null>(null);
  const [relayerFee, setRelayerFee] = useState<bigint | null>(null);
  const [maxSwapAmount, setMaxSwapAmount] = useState<bigint | null>(null);
  const [estimatedSwapAmount, setEstimatedSwapAmount] = useState<bigint | null>(
    null
  );
  const [amount, setAmount] = useState<string>("");
  const baseAmountParsed = amount && parseUnits(amount, USDC_DECIMALS);
  const transferAmountParsed = baseAmountParsed && baseAmountParsed.toBigInt();
  const humanReadableTransferAmount =
    transferAmountParsed && formatUnits(transferAmountParsed, USDC_DECIMALS);
  const oneParsed = parseUnits("1", USDC_DECIMALS).toBigInt();
  let bigIntBalance = BigInt(0);
  try {
    bigIntBalance = BigInt(balance?.amount || "0");
  } catch (e) {}
  const [toNativeAmount, setToNativeAmount] = useState<bigint>(BigInt(0));
  const [debouncedToNativeAmount] = useDebounce(toNativeAmount, 500);
  const amountError =
    transferAmountParsed !== "" && transferAmountParsed <= BigInt(0)
      ? "Amount must be greater than zero"
      : transferAmountParsed > bigIntBalance
      ? "Amount must not be greater than balance"
      : relayerFee && transferAmountParsed < relayerFee
      ? "Amount must at least cover the relayer fee"
      : relayerFee &&
        toNativeAmount &&
        transferAmountParsed < relayerFee + toNativeAmount
      ? "Amount must at least cover the relayer fee and swap amount"
      : "";
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sourceTxHash, setSourceTxHash] = useState<string>("");
  const [sourceTxConfirmed, setSourceTxConfirmed] = useState<boolean>(false);
  const [transferInfo, setTransferInfo] = useState<
    null | [string | null, string, string]
  >(null);
  const isSendComplete = transferInfo !== null;
  const [isRedeeming, setIsRedeeming] = useState<boolean>(false);
  const [isRedeemComplete, setIsRedeemComplete] = useState<boolean>(false);
  const [targetTxHash, setTargetTxHash] = useState<string>("");
  const vaa = transferInfo && transferInfo[0];
  const { isReady, statusMessage } = useIsWalletReady(
    // switch to the target chain if the user needs to manually redeem
    isRedeeming ? targetChain : sourceChain,
    false
  );
  const { provider, signer, signerAddress } = useEthereumProvider();
  const shouldLockFields =
    isSending || isSendComplete || isRedeeming || isRedeemComplete;
  const preventNavigation =
    (isSending || isSendComplete || isRedeeming) && !isRedeemComplete;

  useEffect(() => {
    (async () => {
      if (provider) {
        await switchEvmProviderNetwork(provider, sourceChain);
      }
    })();
  }, [sourceChain, provider]);

  // const handleSourceChange = useCallback((event) => {
  //   const v = event.target.value;
  //   setState((s) => ({
  //     ...s,
  //     sourceChain: v,
  //     targetChain: v === s.targetChain ? s.sourceChain : s.targetChain,
  //   }));
  // }, []);
  // const handleTargetChange = useCallback((event) => {
  //   const v = event.target.value;
  //   setState((s) => ({
  //     ...s,
  //     targetChain: v,
  //     sourceChain: v === s.targetChain ? s.targetChain : s.sourceChain,
  //   }));
  // }, []);
  const handleSwitch = useCallback(() => {
    setState((s) => ({
      ...s,
      sourceChain: s.targetChain,
      targetChain: s.sourceChain,
    }));
  }, []);
  const handleSliderChange = useCallback((event: any, value: any) => {
    setToNativeAmount(parseUnits(value.toString(), USDC_DECIMALS).toBigInt());
  }, []);
  //This effect fetches the source USDC balance for the connected wallet
  useEffect(() => {
    setBalance(null);
    if (!sourceAsset) return;
    if (!signerAddress) return;
    const sourceEVMChain = getEvmChainId(sourceChain);
    if (!sourceEVMChain) return;
    const sourceRPC = EVM_RPC_MAP[sourceEVMChain];
    if (!sourceRPC) return;
    const provider = new ethers.providers.StaticJsonRpcProvider(sourceRPC);
    let cancelled = false;
    (async () => {
      const token = await getEthereumToken(sourceAsset, provider);
      if (cancelled) return;
      const parsedTokenAccount = await ethTokenToParsedTokenAccount(
        token,
        signerAddress
      );
      if (cancelled) return;
      setBalance(parsedTokenAccount);
    })();
    return () => {
      cancelled = true;
    };
  }, [sourceAsset, signerAddress, sourceChain]);
  //This effect fetches the relayer fee for the destination chain (from the source chain, which will be encoded into the transfer)
  useEffect(() => {
    setRelayerFee(null);
    if (!sourceRelayContract) return;
    if (!sourceAsset) return;
    const sourceEVMChain = getEvmChainId(sourceChain);
    if (!sourceEVMChain) return;
    const sourceRPC = EVM_RPC_MAP[sourceEVMChain];
    if (!sourceRPC) return;
    const provider = new ethers.providers.StaticJsonRpcProvider(sourceRPC);
    let cancelled = false;
    (async () => {
      const contract = new Contract(
        sourceRelayContract,
        [
          `function relayerFee(uint16 chainId_, address token) external view returns (uint256)`,
        ],
        provider
      );
      const fee = await contract.relayerFee(targetChain, sourceAsset);
      if (cancelled) return;
      setRelayerFee(fee.toBigInt());
    })();
    return () => {
      cancelled = true;
    };
  }, [sourceRelayContract, sourceAsset, targetChain, sourceChain]);
  //This effect fetches the maximum swap amount from the destination chain
  useEffect(() => {
    setMaxSwapAmount(null);
    if (!targetRelayContract) return;
    if (!targetAsset) return;
    const targetEVMChain = getEvmChainId(targetChain);
    if (!targetEVMChain) return;
    const targetRPC = EVM_RPC_MAP[targetEVMChain];
    if (!targetRPC) return;
    const provider = new ethers.providers.StaticJsonRpcProvider(targetRPC);
    let cancelled = false;
    (async () => {
      const contract = new Contract(
        targetRelayContract,
        [
          `function calculateMaxSwapAmountIn(
              address token
          ) external view returns (uint256)`,
        ],
        provider
      );
      const maxSwap = await contract.calculateMaxSwapAmountIn(targetAsset);
      if (cancelled) return;
      setMaxSwapAmount(maxSwap.toBigInt());
    })();
    return () => {
      cancelled = true;
    };
  }, [targetRelayContract, targetAsset, targetChain]);
  //This effect fetches the estimated swap amount from the destination chain
  useEffect(() => {
    setEstimatedSwapAmount(null);
    if (!targetRelayContract) return;
    if (!targetAsset) return;
    const targetEVMChain = getEvmChainId(targetChain);
    if (!targetEVMChain) return;
    const targetRPC = EVM_RPC_MAP[targetEVMChain];
    if (!targetRPC) return;
    const provider = new ethers.providers.StaticJsonRpcProvider(targetRPC);
    let cancelled = false;
    (async () => {
      const contract = new Contract(
        targetRelayContract,
        [
          `function calculateNativeSwapAmountOut(
            address token,
            uint256 toNativeAmount
        ) external view returns (uint256)`,
        ],
        provider
      );
      const estimatedSwap = await contract.calculateNativeSwapAmountOut(
        targetAsset,
        debouncedToNativeAmount
      );
      if (cancelled) return;
      setEstimatedSwapAmount(estimatedSwap.toBigInt());
    })();
    return () => {
      cancelled = true;
    };
  }, [targetRelayContract, targetAsset, targetChain, debouncedToNativeAmount]);
  //This effect polls to see if the transaction has been redeemed when relaying
  useEffect(() => {
    if (!isSendComplete) return;
    if (!vaa) return;
    if (!targetCircleIntegrationContract) return;
    const targetEVMChain = getEvmChainId(targetChain);
    if (!targetEVMChain) return;
    const targetRPC = EVM_RPC_MAP[targetEVMChain];
    if (!targetRPC) return;
    const provider = new ethers.providers.StaticJsonRpcProvider(targetRPC);
    const hash = hexlify(keccak256(parseVaa(arrayify(vaa)).hash));
    let cancelled = false;
    (async () => {
      let wasRedeemed = false;
      while (!wasRedeemed && !cancelled) {
        try {
          const contract = new Contract(
            targetCircleIntegrationContract,
            [
              `function isMessageConsumed(bytes32 hash) external view returns (bool)`,
            ],
            provider
          );
          wasRedeemed = await contract.isMessageConsumed(hash);
          if (!wasRedeemed) await sleep(5000);
        } catch (e) {
          console.error(
            "An error occurred while checking if the message was consumed",
            e
          );
        }
      }
      if (!cancelled) {
        setIsRedeemComplete(wasRedeemed);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSendComplete, vaa, targetCircleIntegrationContract]);
  const handleAmountChange = useCallback((event: any) => {
    setAmount(event.target.value);
  }, []);
  const handleMaxClick = useCallback(() => {
    if (balance && balance.uiAmountString) {
      setAmount(balance.uiAmountString);
    }
  }, [balance]);

  const [allowanceError, setAllowanceError] = useState("");
  const [shouldApproveUnlimited] = useState(false);
  // const toggleShouldApproveUnlimited = useCallback(
  //   () => setShouldApproveUnlimited(!shouldApproveUnlimited),
  //   [shouldApproveUnlimited]
  // );
  const {
    sufficientAllowance,
    isAllowanceFetching,
    isApproveProcessing,
    approveAmount,
  } = useAllowance(
    sourceChain,
    sourceAsset,
    transferAmountParsed || undefined,
    false,
    sourceRelayContract
  );

  const approveButtonNeeded = isEVMChain(sourceChain) && !sufficientAllowance;
  const notOne = shouldApproveUnlimited || transferAmountParsed !== oneParsed;
  const isApproveDisabled =
    !isReady ||
    !amount ||
    !!amountError ||
    isAllowanceFetching ||
    isApproveProcessing;
  const errorMessage = statusMessage || allowanceError || undefined;
  const approveExactAmount = useMemo(() => {
    return () => {
      setAllowanceError("");
      approveAmount(BigInt(transferAmountParsed)).then(
        () => {
          setAllowanceError("");
          // enqueueSnackbar(null, {
          //   content: (
          //     <Alert severity="success">Approval transaction confirmed</Alert>
          //   ),
          // });
        },
        (error) => setAllowanceError("Failed to approve the token transfer.")
      );
    };
  }, [approveAmount, transferAmountParsed]);
  const approveUnlimited = useMemo(() => {
    return () => {
      setAllowanceError("");
      approveAmount(constants.MaxUint256.toBigInt()).then(
        () => {
          setAllowanceError("");
          // enqueueSnackbar(null, {
          //   content: (
          //     <Alert severity="success">Approval transaction confirmed</Alert>
          //   ),
          // });
        },
        (error) => setAllowanceError("Failed to approve the token transfer.")
      );
    };
  }, [approveAmount]);
  const amountReceived = useMemo(() => {
    if (transferAmountParsed) {
      const received =
        transferAmountParsed - (relayerFee || BigInt(0)) - toNativeAmount;
      if (received > 0) {
        return formatUnits(received, USDC_DECIMALS);
      }
    }
    return "";
  }, [transferAmountParsed, relayerFee, toNativeAmount]);

  const handleTransferClick = useCallback(() => {
    if (!isReady) return;
    if (!signer) return;
    if (!signerAddress) return;
    if (!sourceContract) return;
    if (!sourceAsset) return;
    const sourceEmitter = CIRCLE_EMITTER_ADDRESSES[sourceChain];
    if (!sourceEmitter) return;
    const targetDomain = CIRCLE_DOMAINS[targetChain];
    if (targetDomain === undefined) return;
    if (!transferAmountParsed) return;
    if (!sourceRelayContract) return;
    if (!sourceRelayEmitter) return;
    const contract = new Contract(
      sourceRelayContract,
      [
        `function transferTokensWithRelay(
          address token,
          uint256 amount,
          uint256 toNativeTokenAmount,
          uint16 targetChain,
          bytes32 targetRecipientWallet
        ) external payable returns (uint64 messageSequence)`,
      ],
      signer
    );
    setIsSending(true);
    (async () => {
      try {
        const tx = await contract.transferTokensWithRelay(
          sourceAsset,
          transferAmountParsed,
          toNativeAmount,
          targetChain,
          hexZeroPad(signerAddress, 32)
        );
        setSourceTxHash(tx.hash);
        const receipt = await tx.wait();
        setSourceTxConfirmed(true);
        // recovery test
        // const hash =
        //   "0xa73642c06cdcce5882c208885481b4433c0abf8a4128889ff1996865a06af90d";
        // setSourceTxHash(hash);
        // const receipt = await signer.provider?.getTransactionReceipt(hash);
        // setSourceTxConfirmed(true);
        if (!receipt) {
          throw new Error("Invalid receipt");
        }
        // enqueueSnackbar(null, {
        //   content: (
        //     <Alert severity="success">Transfer transaction confirmed</Alert>
        //   ),
        // });
        // find circle message
        const [circleBridgeMessage, circleAttestation] =
          await handleCircleMessageInLogs(receipt.logs, sourceEmitter);
        if (circleBridgeMessage === null || circleAttestation === null) {
          throw new Error(`Error parsing receipt for ${tx.hash}`);
        }
        // enqueueSnackbar(null, {
        //   content: <Alert severity="success">Circle attestation found</Alert>,
        // });
        // find wormhole message
        const seq = parseSequenceFromLogEth(
          receipt,
          getBridgeAddressForChain(sourceChain)
        );
        const { vaaBytes } = await getSignedVAAWithRetry(
          WORMHOLE_RPC_HOSTS,
          sourceChain,
          sourceRelayEmitter,
          seq
        );
        // TODO: more discreet state for better loading messages
        setTransferInfo([
          `0x${uint8ArrayToHex(vaaBytes)}`,
          circleBridgeMessage,
          circleAttestation,
        ]);
        // enqueueSnackbar(null, {
        //   content: <Alert severity="success">Wormhole message found</Alert>,
        // });
      } catch (e) {
        console.error(e);
        // enqueueSnackbar(null, {
        //   content: <Alert severity="error">{parseError(e)}</Alert>,
        // });
      }
      setIsSending(false);
    })();
  }, [
    isReady,
    signer,
    signerAddress,
    sourceContract,
    sourceAsset,
    sourceChain,
    targetChain,
    transferAmountParsed,
    sourceRelayContract,
    sourceRelayEmitter,
    toNativeAmount,
  ]);

  const handleRedeemClick = useCallback(() => {
    if (!isReady) return;
    if (!signer) return;
    if (!signerAddress) return;
    if (!targetContract) return;
    if (!transferInfo) return;
    if (!targetRelayContract) return;
    if (!vaa) return;
    if (!provider) return;
    setIsRedeeming(true);
    (async () => {
      try {
        await switchEvmProviderNetwork(provider, targetChain);
        // adapted from https://github.com/wormhole-foundation/example-circle-relayer/blob/c488fe61c528b6099a90f01f42e796df7f330485/relayer/src/main.ts
        const contract = new Contract(
          targetRelayContract,
          [
            `function calculateNativeSwapAmountOut(
                address token,
                uint256 toNativeAmount
                ) external view returns (uint256)`,
            `function redeemTokens((bytes,bytes,bytes)) external payable`,
          ],
          signer
        );
        const payloadArray = parseVaa(arrayify(vaa)).payload;
        // parse the domain into a chain
        const toDomain = payloadArray.readUInt32BE(69);
        if (!(toDomain in CIRCLE_DOMAIN_TO_WORMHOLE_CHAIN)) {
          console.warn(`Unknown toDomain ${toDomain}`);
        }
        const toChain = CIRCLE_DOMAIN_TO_WORMHOLE_CHAIN[toDomain];
        // parse the token address and toNativeAmount
        const token = tryUint8ArrayToNative(
          payloadArray.subarray(1, 33),
          toChain
        );
        const toNativeAmount = ethers.utils.hexlify(
          payloadArray.subarray(180, 212)
        );
        const nativeSwapQuote = await contract.calculateNativeSwapAmountOut(
          token,
          toNativeAmount
        );
        const tx = await contract.redeemTokens(transferInfo, {
          value: nativeSwapQuote,
        });
        setTargetTxHash(tx.hash);
        const receipt = await tx.wait();
        if (!receipt) {
          throw new Error("Invalid receipt");
        }
        setIsRedeemComplete(true);
        // enqueueSnackbar(null, {
        //   content: (
        //     <Alert severity="success">Redeem transaction confirmed</Alert>
        //   ),
        // });
      } catch (e) {
        console.error(e);
        // enqueueSnackbar(null, {
        //   content: <Alert severity="error">{parseError(e)}</Alert>,
        // });
      }
      setIsRedeeming(false);
    })();
  }, [
    isReady,
    signer,
    signerAddress,
    transferInfo,
    targetContract,
    targetRelayContract,
    vaa,
    targetChain,
    provider,
  ]);

  useEffect(() => {
    if (preventNavigation) {
      window.onbeforeunload = () => true;
      return () => {
        window.onbeforeunload = null;
      };
    }
  }, [preventNavigation]);

  return (
    <Container
      sx={{
        backgroundColor: "rgba(0,0,0,0.5)",
        border: "0.5px solid rgba(255, 255, 255, 0.35)",
        marginTop: "32px",
      }}
    >
      <KeyAndBalance chainId={sourceChain} />
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginTop: "48px",
        }}
      >
        <Box
          sx={{
            display: "flex",
            height: "160px",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            "& > .MuiTypography-root": {
              marginTop: "8px",
            },
            "& img": { height: 80, maxWidth: 80 },
          }}
        >
          <Typography fontSize={20}>Source</Typography>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "left",
              width: "100%",
              height: "56px",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
            }}
          >
            <img
              src={CHAINS_BY_ID[sourceChain].logo}
              alt={CHAINS_BY_ID[sourceChain].name}
              width="24px"
              height="24px"
              style={{ marginLeft: "16px" }}
            />
            <Typography sx={{ marginLeft: "16px" }}>
              {CHAINS_BY_ID[sourceChain].name}
            </Typography>
          </Box>
          <NumberTextField
            label="Send (USDC)"
            fullWidth
            sx={{ marginTop: 2 }}
            value={amount}
            onChange={handleAmountChange}
            disabled={shouldLockFields}
            onMaxClick={
              balance && balance.uiAmountString ? handleMaxClick : undefined
            }
          />
        </Box>
        <Box
          sx={{
            textAlign: "center",
            marginTop: "42px",
            position: "relative",
            width: "32px",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 1,
            }}
          >
            <ChainSelectArrow
              onClick={handleSwitch}
              disabled={shouldLockFields}
            />
          </Box>
        </Box>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            "& > .MuiTypography-root": {
              marginTop: "8px",
            },
            "& img": { height: 80, maxWidth: 80 },
          }}
        >
          <Typography fontSize={20}>Target</Typography>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "left",
              width: "100%",
              height: "56px",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
            }}
          >
            <img
              src={CHAINS_BY_ID[targetChain].logo}
              alt={CHAINS_BY_ID[targetChain].name}
              width="24px"
              height="24px"
              style={{ marginLeft: "16px" }}
            />
            <Typography sx={{ marginLeft: "16px" }}>
              {CHAINS_BY_ID[targetChain].name}
            </Typography>
          </Box>
          <NumberTextField
            label="Receive (USDC)"
            fullWidth
            sx={{ marginTop: 2 }}
            value={amountReceived}
            disabled={true}
          />
        </Box>
      </Box>

      <Box sx={infoContainer}>
        <Typography variant="body2" style={{ flexGrow: 1 }}>
          Source Balance
        </Typography>
        <Typography variant="body2">
          {balance?.uiAmountString || 0} USDC
        </Typography>
      </Box>
      <Box sx={infoContainer}>
        <Typography variant="body2" style={{ flexGrow: 1 }}>
          Relayer Fee
        </Typography>
        <Typography variant="body2">
          {(relayerFee && `${formatUnits(relayerFee, USDC_DECIMALS)} USDC`) ||
            null}
        </Typography>
      </Box>
      <Box sx={infoContainer}>
        <Typography variant="body2" style={{ flexGrow: 1 }}>
          Destination Gas
        </Typography>
        <Typography variant="body2">
          {formatUnits(toNativeAmount, USDC_DECIMALS)} USDC
        </Typography>
      </Box>
      <Box
        sx={{
          mt: 0.5,
          mb: 2,
          mx: 0,
          "& .MuiSlider-thumb.MuiSlider-active": {
            // avoid increasing the margin further
            boxShadow: "0px 0px 0px 12px rgb(63 81 181 / 16%)",
          },
        }}
      >
        <Slider
          disabled={shouldLockFields}
          onChange={handleSliderChange}
          value={Number(formatUnits(toNativeAmount, USDC_DECIMALS))}
          step={0.001}
          min={0}
          max={Number(formatUnits(maxSwapAmount || 0, USDC_DECIMALS))}
          valueLabelDisplay="off"
          sx={{
            color: "#fff",
          }}
        />
      </Box>
      <Box sx={infoContainer}>
        <Typography variant="body2" style={{ flexGrow: 1 }}>
          Maximum Destination Gas
        </Typography>
        <Typography variant="body2">
          {(maxSwapAmount &&
            `${formatUnits(maxSwapAmount, USDC_DECIMALS)} USDC`) ||
            null}
        </Typography>
      </Box>
      <Box sx={infoContainer}>
        <Typography variant="body2" style={{ flexGrow: 1 }}>
          Estimated Destination Gas
        </Typography>
        <Typography variant="body2">
          {(estimatedSwapAmount &&
            `${formatUnits(
              estimatedSwapAmount,
              METAMASK_CHAIN_PARAMETERS[getEvmChainId(targetChain) || 1]
                ?.nativeCurrency.decimals || 18
            )} ${
              METAMASK_CHAIN_PARAMETERS[getEvmChainId(targetChain) || 1]
                ?.nativeCurrency.symbol || "ETH"
            }`) ||
            null}
        </Typography>
      </Box>
      {transferInfo ? (
        <ButtonWithLoader
          disabled={!isReady || isRedeeming || isRedeemComplete}
          onClick={handleRedeemClick}
          showLoader={isRedeeming}
          error={statusMessage}
        >
          Redeem
        </ButtonWithLoader>
      ) : approveButtonNeeded ? (
        <>
          <ButtonWithLoader
            disabled={isApproveDisabled}
            onClick={
              shouldApproveUnlimited ? approveUnlimited : approveExactAmount
            }
            showLoader={isAllowanceFetching || isApproveProcessing}
            error={errorMessage || amountError}
          >
            {"Approve " +
              (shouldApproveUnlimited
                ? "Unlimited"
                : humanReadableTransferAmount
                ? humanReadableTransferAmount
                : amount) +
              ` Token${notOne ? "s" : ""}`}
          </ButtonWithLoader>
        </>
      ) : (
        <ButtonWithLoader
          disabled={!isReady || isSending}
          onClick={handleTransferClick}
          showLoader={isSending}
          error={statusMessage || amountError}
        >
          Transfer
        </ButtonWithLoader>
      )}
      {!statusMessage && !amountError ? (
        <Typography
          variant="body2"
          sx={{
            color: (theme) => theme.palette.warning.light,
            marginTop: 1,
            textAlign: "center",
          }}
        >
          {isApproveProcessing ? (
            "Waiting for wallet approval and confirmation..."
          ) : isSending ? (
            !sourceTxHash ? (
              "Waiting for wallet approval..."
            ) : !sourceTxConfirmed ? (
              "Waiting for tx confirmation..."
            ) : (
              "Waiting for Circle attestation..."
            )
          ) : isRedeeming ? (
            !targetTxHash ? (
              "Waiting for wallet approval..."
            ) : (
              "Waiting for tx confirmation..."
            )
          ) : (
            <>&nbsp;</>
          )}
        </Typography>
      ) : null}
      <Box
        sx={{
          my: 3,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Stepper
          activeStep={
            isRedeemComplete
              ? 3
              : transferInfo
              ? 2
              : approveButtonNeeded
              ? 0
              : 1
          }
          alternativeLabel
          sx={{ width: "100%", mb: 1 }}
        >
          <Step>
            <StepLabel>Approve</StepLabel>
          </Step>
          <Step>
            <StepLabel>Transfer</StepLabel>
          </Step>
          <Step>
            <StepLabel>Redeem</StepLabel>
          </Step>
        </Stepper>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <ErrorIcon sx={{ color: "#58ECEC", mr: 1 }} />
          <Typography
            sx={{
              color: "#58ECEC",
            }}
          >
            This is a testnet release only; prices don't reflect reality.
          </Typography>
        </Box>
      </Box>
    </Container>
  );
}

export default USDCBridge;
