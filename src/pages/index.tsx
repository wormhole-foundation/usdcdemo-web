import { Button, Container, Fade, Typography } from "@mui/material";
import { Box } from "@mui/system";
import type { PageProps } from "gatsby";
import * as React from "react";
import Layout from "../components/Layout";
import { NoSplit } from "../components/NoSplit";
import { SEO } from "../components/SEO";
import { Link as RouterLink } from "gatsby";
import { ArrowRight } from "@mui/icons-material";

const IndexPage: React.FC<PageProps> = ({ location }) => {
  const [t, setT] = React.useState(1);
  React.useEffect(() => {
    let cancelled = false;
    if (t < 3) {
      setTimeout(() => {
        setT((t) => t + 1);
      }, 1000);
    }
    return () => {
      cancelled = true;
    };
  }, [t]);
  console.log(t);
  return (
    <Layout>
      <SEO title="Home" pathname={location.pathname} />
      <Container maxWidth="lg" sx={{ mt: 10 }}>
        <Fade in={t > 0} timeout={1000}>
          <Typography variant="h1" sx={{ mb: { xs: 6, md: 30 } }}>
            <NoSplit>Native USDC Bridging</NoSplit>{" "}
            <NoSplit>With Wormhole</NoSplit>
          </Typography>
        </Fade>
        <Fade in={t > 1} timeout={1000}>
          <Typography component="p" variant="h3" sx={{ mb: 2 }}>
            <NoSplit>Native in.</NoSplit> <NoSplit>Native out.</NoSplit>{" "}
            <NoSplit>Full composability.</NoSplit>
          </Typography>
        </Fade>
        <Fade in={t > 2} timeout={1000}>
          <Box>
            <Typography sx={{ mb: 2, maxWidth: 600 }}>
              Wormhole partners up with Circle to provide a more seamless USDC
              bridging experience and expanded dApp capability by composing the
              new Cross-Chain Transfer Protocol with a specialized Wormhole
              Circle integration.
            </Typography>
            <Button
              component={RouterLink}
              to="/bridge"
              variant="outlined"
              endIcon={<ArrowRight />}
            >
              Try it out!
            </Button>
          </Box>
        </Fade>
      </Container>
    </Layout>
  );
};

export default IndexPage;
