import { LinkOff } from "@mui/icons-material";
import { Button, Tooltip } from "@mui/material";
import React from "react";

const ToggleConnectedButton = ({
  connect,
  disconnect,
  connected,
  pk,
  walletIcon,
}: {
  connect(): any;
  disconnect(): any;
  connected: boolean;
  pk: string;
  walletIcon?: string;
}) => {
  const is0x = pk.startsWith("0x");
  return connected ? (
    <Tooltip title={pk}>
      <Button
        variant="outlined"
        size="small"
        onClick={disconnect}
        sx={{
          display: "flex",
          margin: "24px auto",
          width: "100%",
          "& img": { height: 24, width: 24 },
        }}
        startIcon={
          walletIcon ? <img src={walletIcon} alt="Wallet" /> : <LinkOff />
        }
      >
        Disconnect {pk.substring(0, is0x ? 6 : 3)}...
        {pk.substr(pk.length - (is0x ? 4 : 3))}
      </Button>
    </Tooltip>
  ) : (
    <Button
      color="primary"
      variant="contained"
      size="small"
      onClick={connect}
      sx={{
        display: "flex",
        margin: "24px auto",
        width: "100%",
        "& img": { height: 24, width: 24 },
      }}
    >
      Connect Wallet
    </Button>
  );
};

export default ToggleConnectedButton;
