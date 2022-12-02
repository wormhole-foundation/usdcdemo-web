import { Container, Link, Typography } from "@mui/material";
import type { PageProps } from "gatsby";
import * as React from "react";
import Layout from "../components/Layout";
import { SEO } from "../components/SEO";

const SECTION_SPACING = { xs: 6, md: 20 };

const DocsPage: React.FC<PageProps> = ({ location }) => {
  return (
    <Layout>
      <SEO title="Docs" pathname={location.pathname} />
      <Container maxWidth="lg" sx={{ mt: 10 }}>
        <Typography variant="h1" sx={{ mb: SECTION_SPACING }}>
          Get Building
        </Typography>
        <Typography component="p" variant="h3" sx={{ mb: 2 }}>
          Under Development
        </Typography>
        <Typography sx={{ mb: 2 }}>
          We are busy building too, so check back soon for more resources! Here
          are some links to get you started in the meantime.
        </Typography>
        <Typography sx={{ mb: 2 }}>
          <Link
            href="https://github.com/wormhole-foundation/wormhole-circle-integration"
            target="_blank"
          >
            Wormhole Circle Integration
          </Link>
        </Typography>
        <Typography sx={{ mb: 2 }}>
          <Link
            href="https://github.com/wormhole-foundation/example-circle-relayer"
            target="_blank"
          >
            Example Circle Relayer
          </Link>
        </Typography>
        <Typography sx={{ mb: 2 }}>
          <Link
            href="https://github.com/wormhole-foundation/example-token-bridge-ui/blob/main/src/components/USDC/index.tsx"
            target="_blank"
          >
            Example UI
          </Link>
        </Typography>
        <Typography sx={{ mb: 2 }}>
          <Link
            href="https://github.com/wormhole-foundation/example-nativeswap-usdc"
            target="_blank"
          >
            Example NativeSwap with USDC
          </Link>
        </Typography>
        <Typography sx={{ mb: 20 }} variant="body2">
          Pro Tip: Star those repos so you can stay closer to the action!
        </Typography>
      </Container>
    </Layout>
  );
};

export default DocsPage;
