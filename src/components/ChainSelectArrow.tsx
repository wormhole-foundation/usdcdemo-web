import { ArrowForward, SwapHoriz } from "@mui/icons-material";
import { IconButton } from "@mui/material";
import React from "react";

export default function ChainSelectArrow({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled: boolean;
}) {
  const [showSwap, setShowSwap] = React.useState(false);

  return (
    <IconButton
      onClick={onClick}
      onMouseEnter={() => {
        setShowSwap(true);
      }}
      onMouseLeave={() => {
        setShowSwap(false);
      }}
      disabled={disabled}
    >
      {showSwap ? <SwapHoriz /> : <ArrowForward />}
    </IconButton>
  );
}
