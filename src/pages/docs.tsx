import { Container, Typography } from "@mui/material";
import type { PageProps } from "gatsby";
import * as React from "react";
import Layout from "../components/Layout";
import { SEO } from "../components/SEO";

const BridgePage: React.FC<PageProps> = ({ location }) => {
  return (
    <Layout>
      <SEO title="USDC Bridge" pathname={location.pathname} />
      <Container maxWidth="sm" sx={{ mt: 10, textAlign: "center" }}>
        <Typography>Coming Soon</Typography>
      </Container>
    </Layout>
  );
};

export default BridgePage;
