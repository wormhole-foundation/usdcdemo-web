import React, { useEffect, useState } from "react";
import {
  AppBar,
  Box,
  Button,
  Link,
  useTheme,
  useMediaQuery,
  Toolbar,
} from "@mui/material";
import { Link as RouterLink } from "gatsby";

const Header = () => {
  return (
    <>
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Link component={RouterLink} to="/">
            Home
          </Link>
          &nbsp; &nbsp; &nbsp;
          <Link component={RouterLink} to="/bridge">
            Bridge
          </Link>
          &nbsp; &nbsp; &nbsp;
          <Link component={RouterLink} to="/docs">
            Docs
          </Link>
        </Toolbar>
      </AppBar>
    </>
  );
};

export default Header;
