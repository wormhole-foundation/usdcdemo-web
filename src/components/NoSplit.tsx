import React from "react";

export const NoSplit: React.FC<{ children: string }> = ({ children }) => (
  <span style={{ display: "inline-block" }}>{children}</span>
);
