import { useCallback, useState } from "react";
import { Typography } from "@mui/material";
import { useEthereumProvider } from "../contexts/EthereumProviderContext";
import ToggleConnectedButton from "./ToggleConnectedButton";
import EvmConnectWalletDialog from "./EvmConnectWalletDialog";
import { ChainId } from "@certusone/wormhole-sdk";
import React from "react";

const EthereumSignerKey = ({ chainId }: { chainId: ChainId }) => {
  const { disconnect, signerAddress, providerError } = useEthereumProvider();

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const openDialog = useCallback(() => {
    setIsDialogOpen(true);
  }, [setIsDialogOpen]);

  const closeDialog = useCallback(() => {
    setIsDialogOpen(false);
  }, [setIsDialogOpen]);

  return (
    <>
      <ToggleConnectedButton
        connect={openDialog}
        disconnect={disconnect}
        connected={!!signerAddress}
        pk={signerAddress || ""}
      />
      <EvmConnectWalletDialog
        isOpen={isDialogOpen}
        onClose={closeDialog}
        chainId={chainId}
      />
      {providerError ? (
        <Typography variant="body2" color="error">
          {providerError}
        </Typography>
      ) : null}
    </>
  );
};

export default EthereumSignerKey;
