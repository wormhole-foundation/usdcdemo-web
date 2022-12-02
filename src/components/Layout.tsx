import * as React from "react";
import Header from "./Header";

const Layout: React.FC<{ children: React.ReactNode }> = ({
  children,
}: {
  children: React.ReactNode;
}) => (
  <main style={{ overflow: "hidden", position: "relative" }}>
    <Header />
    <div style={{ minHeight: "calc(100vh - 110px)" }}>{children}</div>
  </main>
);
export default Layout;
