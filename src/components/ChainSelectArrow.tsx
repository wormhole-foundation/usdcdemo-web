import { SwapHorizontalCircle } from "@mui/icons-material";
import { IconButton } from "@mui/material";
import React from "react";
import swapIcon from "../icons/swap.svg";

export default function ChainSelectArrow({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <IconButton onClick={onClick} disabled={disabled}>
      <img src={swapIcon} width="48px" height="48px" alt="swap" />
    </IconButton>
  );
}
