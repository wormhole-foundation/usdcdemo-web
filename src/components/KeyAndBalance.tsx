import { ChainId, isEVMChain } from "@certusone/wormhole-sdk";
import EthereumSignerKey from "./EthereumSignerKey";
import React from "react";

function KeyAndBalance({ chainId }: { chainId: ChainId }) {
  if (isEVMChain(chainId)) {
    return <EthereumSignerKey chainId={chainId} />;
  }
  return null;
}

export default KeyAndBalance;
