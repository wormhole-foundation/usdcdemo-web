import { ArrowForwardRounded, MenuBookOutlined } from "@mui/icons-material";
import { Button, Container, Fade, Link, Typography } from "@mui/material";
import { Box } from "@mui/system";
import type { PageProps } from "gatsby";
import { Link as RouterLink } from "gatsby";
import * as React from "react";
import Layout from "../components/Layout";
import { NoSplit } from "../components/NoSplit";
import { SEO } from "../components/SEO";
import Discord from "../icons/discord.inline.svg";
import Docs from "../icons/docs.inline.svg";
import Github from "../icons/github.inline.svg";
import Medium from "../icons/medium.inline.svg";
import Telegram from "../icons/telegram.inline.svg";
import Twitter from "../icons/twitter.inline.svg";

const linkStyle = {
  display: "inline-flex",
  padding: "0 12px",
  transition: "250ms cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    transform: "scale(1.2)",
  },
};

// External
export const blog = "https://wormholecrypto.medium.com/";
export const docs = "https://book.wormhole.com/";
export const discord = "https://discord.gg/wormholecrypto";
export const github = "https://github.com/wormhole-foundation";
export const telegram = "https://t.me/wormholecrypto";
export const twitter = "https://twitter.com/wormholecrypto";

const FADE_TIMEOUT = 3000;
const FADE_DELAY = 500;
const SECTION_SPACING = { xs: 6, md: 20 };

const IndexPage: React.FC<PageProps> = ({ location }) => {
  const [t, setT] = React.useState(1);
  React.useEffect(() => {
    let cancelled = false;
    if (t < 7) {
      setTimeout(() => {
        setT((t) => t + 1);
      }, FADE_DELAY);
    }
    return () => {
      cancelled = true;
    };
  }, [t]);
  return (
    <Layout>
      <SEO title="Home" pathname={location.pathname} />
      <Container maxWidth="lg" sx={{ mt: 10 }}>
        <Fade in={t > 0} timeout={FADE_TIMEOUT}>
          <Typography variant="h1" sx={{ mb: SECTION_SPACING }}>
            <NoSplit>Native USDC Bridging</NoSplit>{" "}
            <NoSplit>With Wormhole</NoSplit>
          </Typography>
        </Fade>
        <Fade in={t > 1} timeout={FADE_TIMEOUT}>
          <Typography component="p" variant="h3" sx={{ mb: 2 }}>
            <NoSplit>Native in.</NoSplit> <NoSplit>Native out.</NoSplit>{" "}
            <NoSplit>Full composability.</NoSplit>
          </Typography>
        </Fade>
        <Fade in={t > 2} timeout={FADE_TIMEOUT}>
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
              endIcon={<ArrowForwardRounded />}
            >
              Try it out!
            </Button>
          </Box>
        </Fade>
        <Fade in={t > 3} timeout={FADE_TIMEOUT}>
          <Typography
            component="p"
            variant="h3"
            sx={{ mt: SECTION_SPACING, mb: 2 }}
          >
            <NoSplit>Start Building Today.</NoSplit>
          </Typography>
        </Fade>
        <Fade in={t > 4} timeout={FADE_TIMEOUT}>
          <Box>
            <Typography sx={{ mb: 2, maxWidth: 600 }}>
              <NoSplit>Open source from the start.</NoSplit> Dive in and develop
              on the
              <NoSplit>cutting-edge of cross-chain.</NoSplit>
            </Typography>
            <Button
              component={RouterLink}
              to="/docs"
              variant="outlined"
              endIcon={<MenuBookOutlined />}
            >
              Check the docs!
            </Button>
          </Box>
        </Fade>
        <Fade in={t > 5} timeout={FADE_TIMEOUT}>
          <Typography
            component="p"
            variant="h3"
            sx={{ mt: SECTION_SPACING, mb: 2 }}
          >
            <NoSplit>Stay in the loop.</NoSplit>
          </Typography>
        </Fade>
        <Fade in={t > 6} timeout={FADE_TIMEOUT}>
          <Box
            sx={{
              display: "flex",
              flex: 1,
              alignItems: "center",
              mx: -1.5,
              pb: 20,
            }}
          >
            <Link sx={linkStyle} href={discord} target="_blank">
              <img src={Discord} alt="Discord" />
            </Link>

            <Link sx={linkStyle} href={twitter} target="_blank">
              <img src={Twitter} alt="Twitter" />
            </Link>

            <Link sx={linkStyle} href={telegram} target="_blank">
              <img src={Telegram} alt="Telegram" />
            </Link>

            <Link sx={linkStyle} href={github}>
              <img src={Github} alt="Github" />
            </Link>

            <Link sx={linkStyle} href={docs} target="_blank">
              <img src={Docs} alt="Docs" />
            </Link>

            <Link sx={linkStyle} href={blog} target="_blank">
              <img src={Medium} alt="Medium" />
            </Link>
          </Box>
        </Fade>
      </Container>
    </Layout>
  );
};

export default IndexPage;
