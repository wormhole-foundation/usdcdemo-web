import { AppBar, Link, Toolbar } from "@mui/material";
import { Link as RouterLink } from "gatsby";
import React from "react";

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
