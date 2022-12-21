import {
  getSignedVAAWithRetry,
  parseVaa,
  uint8ArrayToHex,
} from "@certusone/wormhole-sdk";
import {
  Box,
  Button,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from "@mui/material";
import { ethers } from "ethers";
import { hexlify, keccak256 } from "ethers/lib/utils";
import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import ButtonWithLoader from "../components/ButtonWithLoader";
import ChainSelectArrow from "../components/ChainSelectArrow";
import KeyAndBalance from "../components/KeyAndBalance";
import NumberTextField from "../components/NumberTextField";
import { useEthereumProvider } from "../contexts/EthereumProviderContext";
import useIsWalletReady from "../hooks/useIsWalletReady";
import {
  AVAX_TOKEN_INFO,
  ETH_TOKEN_INFO,
  TokenInfo,
  WORMHOLE_RPC_HOSTS,
} from "../utils/consts";
import { UniswapToUniswapExecutor } from "../swapper/swapper";
import { ICircleIntegration__factory } from "../ethers-contracts";
import ErrorIcon from "@mui/icons-material/Error";
import { switchEvmProviderNetwork } from "../utils/ethereum";
import SlippageDialog from "./SlippageDialog";

// Ported from example-token-bridge-ui

const infoContainer = {
  display: "flex",
  textAlign: "left",
  mt: 2,
  mb: 1,
  mx: 0,
};

const RELAYER_FEE_USDC = "0.00001";

type State = {
  sourceTokenInfo: TokenInfo;
  targetTokenInfo: TokenInfo;
};

function NativeSwap() {
  const [{ sourceTokenInfo, targetTokenInfo }, setState] = useState<State>({
    sourceTokenInfo: ETH_TOKEN_INFO,
    targetTokenInfo: AVAX_TOKEN_INFO,
  });
  const [amountIn, setAmountIn] = useState("");
  const [amountOut, setAmountOut] = useState("");
  const [deadline, setDeadline] = useState("5");
  const [slippage, setSlippage] = useState("1");
  const [executor, setExecutor] = useState<UniswapToUniswapExecutor | null>(
    null
  );
  const [isSwapping, setIsSwapping] = useState(false);
  const [isComputingQuote, setIsComputingQuote] = useState(false);
  const [hasQuote, setHasQuote] = useState(false);
  const { provider, signer, signerAddress, disconnect } = useEthereumProvider();
  const [isSourceSwapComplete, setIsSourceSwapComplete] = useState(false);
  const [isTargetSwapComplete, setIsTargetSwapComplete] = useState(false);
  const [hasSignedVAA, setHasSignedVAA] = useState(false);
  const [relayerTimeoutString, setRelayerTimeoutString] = useState("");
  const [balance, setBalance] = useState<ethers.BigNumber | null>(null);

  const { isReady, statusMessage } = useIsWalletReady(
    // switch to target chain when user must manually redeem
    isSourceSwapComplete && relayerTimeoutString
      ? targetTokenInfo.chainId
      : sourceTokenInfo.chainId,
    false
  );

  useEffect(() => {
    (async () => {
      if (!isReady) {
        setBalance(null);
        return;
      }
      try {
        if (signer) {
          setBalance(await signer.getBalance());
        }
      } catch (e) {
        setBalance(null);
        console.error(e);
      }
    })();
  }, [signer, isReady]);

  useEffect(() => {
    (async () => {
      if (provider) {
        await switchEvmProviderNetwork(provider, sourceTokenInfo.chainId);
      }
    })();
  }, [sourceTokenInfo, provider]);

  const computeQuote = useCallback(() => {
    (async () => {
      setHasQuote(false);
      setIsComputingQuote(true);
      setAmountOut("");
      try {
        if (
          parseFloat(amountIn) > 0 &&
          !isNaN(parseFloat(deadline)) &&
          !isNaN(parseFloat(slippage))
        ) {
          const executor = new UniswapToUniswapExecutor();
          await executor.initialize(
            sourceTokenInfo.address,
            targetTokenInfo.address,
            true
          );
          await executor.computeAndVerifySrcPoolAddress().catch((e) => {
            throw new Error("failed to verify source pool address");
          });
          await executor.computeAndVerifyDstPoolAddress().catch((e) => {
            throw new Error("failed to verify dest pool address");
          });
          executor.setDeadlines((parseFloat(deadline) * 60).toString());
          executor.setSlippage((parseFloat(slippage) / 100).toString());
          executor.setRelayerFee(RELAYER_FEE_USDC);
          const quote = await executor.computeQuoteExactIn(amountIn);
          setExecutor(executor);
          setAmountOut(parseFloat(quote.minAmountOut).toFixed(8));
          setHasQuote(true);
        }
      } catch (e) {
        console.error(e);
        //enqueueSnackbar(null, {
        //  content: <Alert severity="error">{parseError(e)}</Alert>,
        //});
      }
      setIsComputingQuote(false);
    })();
  }, [
    sourceTokenInfo,
    targetTokenInfo,
    amountIn,
    deadline,
    slippage,
    //enqueueSnackbar,
  ]);

  const debouncedComputeQuote = useDebouncedCallback(computeQuote, 1000);

  useEffect(() => {
    debouncedComputeQuote();
  }, [
    sourceTokenInfo,
    targetTokenInfo,
    amountIn,
    deadline,
    slippage,
    debouncedComputeQuote,
  ]);

  const handleAmountChange = useCallback((event: any) => {
    setAmountIn(event.target.value);
  }, []);

  const handleSlippageChange = useCallback((event: any) => {
    setSlippage(event.target.value);
  }, []);

  const handleDeadlineChange = useCallback((deadline: any) => {
    setDeadline(deadline);
  }, []);

  const handleMaxClick = useCallback(() => {
    if (balance) {
      setAmountIn(
        parseFloat(
          parseFloat(ethers.utils.formatEther(balance || 0)).toFixed(8)
        ).toString()
      );
    }
  }, [balance]);

  const handleSwitch = useCallback(() => {
    setState((s) => ({
      ...s,
      sourceTokenInfo: s.targetTokenInfo,
      targetTokenInfo: s.sourceTokenInfo,
    }));
    setAmountIn("");
    setAmountOut("");
  }, []);

  const reset = useCallback(() => {
    setIsSwapping(false);
    setHasQuote(false);
    setIsSourceSwapComplete(false);
    setHasSignedVAA(false);
    setIsTargetSwapComplete(false);
    setAmountIn("");
    setAmountOut("");
    setRelayerTimeoutString("");
    disconnect();
  }, [disconnect]);

  const handleSwapClick = useCallback(async () => {
    if (
      provider &&
      signer &&
      signerAddress &&
      executor &&
      executor.srcExecutionParams &&
      executor.dstExecutionParams
    ) {
      try {
        setIsSwapping(true);
        setIsSourceSwapComplete(false);
        setHasSignedVAA(false);
        setIsTargetSwapComplete(false);
        setRelayerTimeoutString("");

        const sourceReceipt = await executor.evmApproveAndSwap(
          signer,
          signerAddress
        );
        console.log("firstSwapTransactionHash:", sourceReceipt.transactionHash);
        setIsSourceSwapComplete(true);

        if (!executor.vaaSearchParams) {
          throw Error("vaaSearchParams is not set");
        }
        // Wait for the guardian network to reach consensus and emit the signedVAA
        const { vaaBytes } = await getSignedVAAWithRetry(
          WORMHOLE_RPC_HOSTS,
          executor.srcExecutionParams.wormhole.chainId,
          executor.vaaSearchParams.emitterAddress,
          executor.vaaSearchParams.sequence
        );
        setHasSignedVAA(true);

        const vaaHash = hexlify(keccak256(parseVaa(vaaBytes).hash));

        const circleEmitter = ICircleIntegration__factory.connect(
          executor.dstExecutionParams.wormhole.circleIntegrationAddress,
          //@ts-ignore
          executor.quoter.getDstEvmProvider()
        );
        //  Check if the signedVAA has redeemed by the relayer
        let isCompleted = false;

        let retries = 0;
        while (!isCompleted && retries <= 20) {
          isCompleted = await circleEmitter.isMessageConsumed(vaaHash);
          ++retries;

          await new Promise((resolve) => setTimeout(resolve, 5000));
        }

        if (!isCompleted) {
          // If the relayer hasn't redeemed the signedVAA, then manually redeem it ourselves
          setRelayerTimeoutString(
            "Timed out waiting for relayer. You'll need to complete the target swap manually."
          );
          await switchEvmProviderNetwork(provider, targetTokenInfo.chainId);
          const targetReceipt = await executor.fetchVaaAndSwap(signer);
          console.log(
            "secondSwapTransactionHash:",
            targetReceipt.transactionHash
          );
        }
        setIsTargetSwapComplete(true);
        setIsSwapping(false);
      } catch (e: any) {
        reset();
        console.error(e);
        //enqueueSnackbar(null, {
        //  content: <Alert severity="error">{parseError(e)}</Alert>,
        //});
      }
    }
  }, [
    provider,
    signer,
    signerAddress,
    executor,
    sourceTokenInfo,
    targetTokenInfo,
    reset,
  ]);

  const readyToSwap = provider && signer && hasQuote && isReady;

  const shouldLockFields =
    isSwapping ||
    isComputingQuote ||
    isSourceSwapComplete ||
    isTargetSwapComplete;

  useEffect(() => {
    if (isSwapping) {
      window.onbeforeunload = () => true;
      return () => {
        window.onbeforeunload = null;
      };
    }
  }, [isSwapping]);

  return (
    <Container
      sx={{
        backgroundColor: "rgba(0,0,0,0.5)",
        border: "0.5px solid rgba(255, 255, 255, 0.35)",
        marginTop: "32px",
      }}
    >
      <KeyAndBalance chainId={sourceTokenInfo.chainId} />
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
              src={sourceTokenInfo.logo}
              alt={sourceTokenInfo.chainName}
              width="24px"
              height="24px"
              style={{ marginLeft: "16px" }}
            />
            <Typography sx={{ marginLeft: "16px" }}>
              {sourceTokenInfo.chainName}
            </Typography>
          </Box>
          <NumberTextField
            label={`Send (${sourceTokenInfo.name})`}
            fullWidth
            sx={{ marginTop: 2 }}
            value={amountIn}
            onChange={handleAmountChange}
            disabled={shouldLockFields}
            onMaxClick={balance ? handleMaxClick : undefined}
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
              src={targetTokenInfo.logo}
              alt={targetTokenInfo.chainName}
              width="24px"
              height="24px"
              style={{ marginLeft: "16px" }}
            />
            <Typography sx={{ marginLeft: "16px" }}>
              {targetTokenInfo.chainName}
            </Typography>
          </Box>
          <NumberTextField
            label={`Receive (${targetTokenInfo.name})`}
            fullWidth
            sx={{ marginTop: 2 }}
            value={amountOut}
            onChange={handleAmountChange}
            disabled={true}
          />
        </Box>
      </Box>
      <Box sx={infoContainer}>
        <Typography variant="body2" style={{ flexGrow: 1 }}>
          Source Balance
        </Typography>
        <Typography variant="body2">
          {`${+parseFloat(ethers.utils.formatEther(balance || 0)).toFixed(8)} ${
            sourceTokenInfo.name
          }`}
        </Typography>
      </Box>
      <Box sx={infoContainer}>
        <Typography variant="body2" style={{ flexGrow: 1 }}>
          Relayer Fee
        </Typography>
        <Typography variant="body2">{`${RELAYER_FEE_USDC} USDC`}</Typography>
      </Box>
      <Box sx={{ ...infoContainer, alignItems: "center" }}>
        <Typography variant="body2" style={{ flexGrow: 1 }}>
          Slippage Tolerance
        </Typography>
        <TextField
          value={slippage}
          select
          onChange={handleSlippageChange}
          disabled={shouldLockFields}
        >
          <MenuItem value={".5"}>0.5%</MenuItem>
          <MenuItem value={"1"}>1%</MenuItem>
          <MenuItem value={"1.5"}>1.5%</MenuItem>
          <MenuItem value={"2"}>2%</MenuItem>
        </TextField>
      </Box>
      <ButtonWithLoader
        disabled={!readyToSwap || isSwapping || isSourceSwapComplete}
        onClick={handleSwapClick}
        showLoader={isSwapping}
        error={statusMessage}
      >
        Confirm and proceed with transfer
      </ButtonWithLoader>
      {!statusMessage && isSwapping ? (
        <Typography
          variant="body2"
          sx={{
            color: (theme) => theme.palette.warning.light,
            marginTop: 1,
            textAlign: "center",
          }}
        >
          {!isSourceSwapComplete ? (
            "Waiting for wallet approval and confirmation..."
          ) : !isTargetSwapComplete && !relayerTimeoutString ? (
            "Waiting for relayer..."
          ) : !isTargetSwapComplete && relayerTimeoutString ? (
            relayerTimeoutString
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
            isTargetSwapComplete
              ? 3
              : relayerTimeoutString 
              ? 2
              : isSourceSwapComplete
              ? 1
              : 0
          }
          alternativeLabel
          sx={{ width: "100%", mb: 1 }}
        >
          <Step>
            <StepLabel>Source Swap</StepLabel>
          </Step>
          <Step>
            <StepLabel>Relay</StepLabel>
          </Step>
          <Step>
            <StepLabel>Target Swap</StepLabel>
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

export default NativeSwap;
