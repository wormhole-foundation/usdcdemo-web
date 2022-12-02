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
  CHAINS_BY_ID,
  getBridgeAddressForChain,
  getEvmChainId,
  WORMHOLE_RPC_HOSTS,
} from "../utils/consts";
import {
  ethTokenToParsedTokenAccount,
  getEthereumToken,
  ParsedTokenAccount,
} from "../utils/ethereum";
import {
  EVM_RPC_MAP,
  METAMASK_CHAIN_PARAMETERS,
} from "../utils/metaMaskChainParameters";

// Ported from example-token-bridge-ui

const infoContainer = {
  display: "flex",
  textAlign: "left",
  mt: 2,
  mb: 1,
  mx: 0,
};

function findCircleMessageInLogs(
  logs: ethers.providers.Log[],
  circleEmitterAddress: string
): string | null {
  for (const log of logs) {
    if (log.address === circleEmitterAddress) {
      const messageSentIface = new ethers.utils.Interface([
        "event MessageSent(bytes message)",
      ]);
      return messageSentIface.parseLog(log).args.message as string;
    }
  }

  return null;
}

async function sleep(timeout: number) {
  return new Promise((resolve) => setTimeout(resolve, timeout));
}

async function getCircleAttestation(
  messageHash: ethers.BytesLike,
  timeout: number = 2000
) {
  while (true) {
    // get the post
    const response = await axios
      .get(`https://iris-api-sandbox.circle.com/attestations/${messageHash}`)
      .catch((reason) => {
        return null;
      })
      .then(async (response: AxiosResponse | null) => {
        if (
          response !== null &&
          response.status === 200 &&
          response.data.status === "complete"
        ) {
          return response.data.attestation as string;
        }

        return null;
      });

    if (response !== null) {
      return response;
    }

    await sleep(timeout);
  }
}

async function handleCircleMessageInLogs(
  logs: ethers.providers.Log[],
  circleEmitterAddress: string
): Promise<[string | null, string | null]> {
  const circleMessage = findCircleMessageInLogs(logs, circleEmitterAddress);
  if (circleMessage === null) {
    return [null, null];
  }

  const circleMessageHash = ethers.utils.keccak256(circleMessage);
  const signature = await getCircleAttestation(circleMessageHash);

  return [circleMessage, signature];
}

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
  [CHAIN_ID_ETH]: "0x40A61D3D2AfcF5A5d31FcDf269e575fB99dd87f7",
  [CHAIN_ID_AVAX]: "0x52FfFb3EE8Fa7838e9858A2D5e454007b9027c3C",
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
  [CHAIN_ID_ETH]: "0x2dacca34c172687efa15243a179ea9e170864a67",
  [CHAIN_ID_AVAX]: "0x7b135d7959e59ba45c55ae08c14920b06f2658ec",
};
const USDC_WH_INTEGRATION: { [key in ChainId]?: string } = {
  [CHAIN_ID_ETH]: "0xbdcc4ebe3157df347671e078a41ee5ce137cd306",
  [CHAIN_ID_AVAX]: "0xb200977d46aea35ce6368d181534f413570a0f54",
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

function USDC() {
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
    transferInfo ? targetChain : sourceChain
  );
  const { provider, signer, signerAddress } = useEthereumProvider();
  const shouldLockFields =
    isSending || isSendComplete || isRedeeming || isRedeemComplete;
  const preventNavigation =
    (isSending || isSendComplete || isRedeeming) && !isRedeemComplete;

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
    const provider = new ethers.providers.JsonRpcProvider(sourceRPC);
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
    const provider = new ethers.providers.JsonRpcProvider(sourceRPC);
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
    const provider = new ethers.providers.JsonRpcProvider(targetRPC);
    let cancelled = false;
    (async () => {
      const contract = new Contract(
        targetRelayContract,
        [
          `function calculateMaxSwapAmount(
              address token
          ) external view returns (uint256)`,
        ],
        provider
      );
      const maxSwap = await contract.calculateMaxSwapAmount(targetAsset);
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
    const provider = new ethers.providers.JsonRpcProvider(targetRPC);
    let cancelled = false;
    (async () => {
      const contract = new Contract(
        targetRelayContract,
        [
          `function calculateNativeSwapAmount(
            address token,
            uint256 toNativeAmount
        ) external view returns (uint256)`,
        ],
        provider
      );
      const estimatedSwap = await contract.calculateNativeSwapAmount(
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
    if (!isReady) return;
    if (!signer) return;
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
            signer
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
  }, [isSendComplete, vaa, targetCircleIntegrationContract, isReady, signer]);
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
    setIsRedeeming(true);
    (async () => {
      try {
        // adapted from https://github.com/wormhole-foundation/example-circle-relayer/blob/c488fe61c528b6099a90f01f42e796df7f330485/relayer/src/main.ts
        const contract = new Contract(
          targetRelayContract,
          [
            `function calculateNativeSwapAmount(
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
        const nativeSwapQuote = await contract.calculateNativeSwapAmount(
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
    <>
      <Container maxWidth="xs">
        <KeyAndBalance chainId={sourceChain} />
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 2,
          }}
        >
          <Box
            sx={{
              border: (theme) => `1px solid ${theme.palette.divider}`,
              borderRadius: "4px",
              display: "flex",
              width: "160px",
              maxWidth: "160px",
              height: "160px",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              "& > .MuiTypography-root": {
                marginTop: "8px",
              },
              "& img": { height: 80, maxWidth: 80 },
            }}
          >
            <img
              src={CHAINS_BY_ID[sourceChain].logo}
              alt={CHAINS_BY_ID[sourceChain].name}
              className={classes.chainLogo}
            />
            <Typography>Source</Typography>
          </Box>
          <Box sx={{ flexGrow: 1, textAlign: "center" }}>
            <ChainSelectArrow
              onClick={handleSwitch}
              disabled={shouldLockFields}
            />
          </Box>
          <Box
            sx={{
              border: (theme) => `1px solid ${theme.palette.divider}`,
              borderRadius: "4px",
              display: "flex",
              width: "160px",
              maxWidth: "160px",
              height: "160px",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              "& > .MuiTypography-root": {
                marginTop: "8px",
              },
              "& img": { height: 80, maxWidth: 80 },
            }}
          >
            <img
              src={CHAINS_BY_ID[targetChain].logo}
              alt={CHAINS_BY_ID[targetChain].name}
              className={classes.chainLogo}
            />
            <Typography>Target</Typography>
          </Box>
        </Box>
        <NumberTextField
          variant="outlined"
          label="Amount (USDC)"
          fullWidth
          sx={{ marginTop: 2 }}
          value={amount}
          onChange={handleAmountChange}
          disabled={shouldLockFields}
          onMaxClick={
            balance && balance.uiAmountString ? handleMaxClick : undefined
          }
        />
        <Box sx={infoContainer}>
          <Typography variant="body2" style={{ flexGrow: 1 }}>
            Source Balance
          </Typography>
          <Typography variant="body2">
            {balance?.uiAmountString || 0} USDC
          </Typography>
        </Box>
        {/* TODO: destination balance */}
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
        {/* TODO: enforce max */}
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
            {/* <FormControlLabel
            control={
              <Checkbox
                checked={shouldApproveUnlimited}
                onChange={toggleShouldApproveUnlimited}
                color="primary"
              />
            }
            label="Approve Unlimited Tokens"
          /> */}
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
        <Box sx={{ marginTop: 4 }}>
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
        </Box>
      </Container>
    </>
  );
}

const BridgePage: React.FC<PageProps> = ({ location }) => {
  return (
    <Layout>
      <SEO title="USDC Bridge" pathname={location.pathname} />
      <EthereumProviderProvider>
        <Container
          sx={{
            maxWidth: { xl: 540 },
            p: 4,
            margin: "auto",
            borderRadius: 4,
            mt: { xs: 2, sm: 10 },
            backgroundColor: "rgba(255, 255, 255, .03)",
            backdropFilter: "blur(5px)",
          }}
        >
          <USDC />
        </Container>
      </EthereumProviderProvider>
    </Layout>
  );
};

export default BridgePage;
