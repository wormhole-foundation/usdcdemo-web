import {
  createTheme,
  CssBaseline,
  responsiveFontSizes,
  ThemeProvider,
} from "@mui/material";
import React from "react";
import bg from "../../src/images/bg.jpg";

let theme = createTheme({
  breakpoints: {
    values: {
      xs: 0,
      ise: 400,
      sm: 768,
      md: 992,
      lg: 1200,
      b1440: 1400,
      xl: 1536,
    },
  },
  palette: {
    mode: "dark",
    background: {
      default: "#000",
    },
  },
  typography: {
    fontFamily: ["IBM Plex Sans", "Helvetica", "Arial"].join(","),
    fontSize: 14,
    body1: {
      fontWeight: 300,
      lineHeight: 1.57,
      fontSize: 20,
      color: "#fff",
    },
    body2: {
      fontWeight: 300,
      lineHeight: 1.57,
      fontSize: 16,
      color: "#fff",
      fontFamily: ["Chakra petch", "Helvetica", "Arial"].join(","),
    },
    h1: {
      fontWeight: 300,
      fontFamily: ["Chakra petch", "Helvetica", "Arial"].join(","),
      fontSize: 74,
      lineHeight: 1,
    },
    h2: {
      fontWeight: 300,
      fontFamily: ["Chakra petch", "Helvetica", "Arial"].join(","),
      fontSize: 56,
      lineHeight: 1,
    },
    h3: {
      fontSize: 24,
      fontWeight: 700,
    },
    h4: {
      fontSize: 26,
      fontFamily: ["Chakra petch", "Helvetica", "Arial"].join(","),
      fontWeight: 500,
    },
    caption: {
      fontFamily: ["IBM Plex Mono", "Helvetica", "Arial"].join(","),
      fontSize: 12,
      lineHeight: 1.4,
    },
    subtitle1: {
      fontFamily: ["IBM Plex Mono", "Helvetica", "Arial"].join(","),
      fontSize: 14,
      fontWeight: 600,
      lineHeight: 1.4,
    },
    subtitle2: {
      fontFamily: ["IBM Plex Mono", "Helvetica", "Arial"].join(","),
      fontSize: 18,
      fontWeight: 400,
      lineHeight: 1.33,
      letterSpacing: "-0.03em",
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundImage: `url(${bg})`,
          backgroundPosition: "top center",
          backgroundRepeat: "repeat-y",
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          color: "inherit",
        },
        body1: {
          fontWeight: 400,
          fontFamily: ["IBM Plex Mono", "Helvetica", "Arial"].join(","),
        },
        body2: {
          fontFamily: ["Chakra petch", "Helvetica", "Arial"].join(","),
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          fontSize: 12,
          lineHeight: 1,
          fontWeight: 600,
          color: "#fff",
          fontFamily: ["IBM Plex Mono", "Helvetica", "Arial"].join(","),
          textTransform: "none",
          transitionDelay: ".1s",
          "& svg": {
            transition: "250ms cubic-bezier(0.4, 0, 0.2, 1)",
            fill: "currentColor",
          },
          "&:hover": {
            backgroundColor: "transparent",
          },
        },
        outlined: {
          borderRadius: 0,
          padding: "0 23px",
          height: 40,
          border: "1px solid rgba(255,255,255, .5)",
          lineHeight: 1,
          position: "relative",
          overflow: "hidden",
          "&:before, &:after": {
            content: '""',
            position: "absolute",
            height: "50%",
            width: 0,
            backgroundColor: "#fff",
            transition: "250ms cubic-bezier(0.4, 0, 0.2, 1)",
            zIndex: -1,
          },
          "&:before": {
            left: 0,
            top: 0,
          },
          "&:after": {
            right: 0,
            bottom: 0,
          },
          "& svg": {
            transition: "250ms cubic-bezier(0.4, 0, 0.2, 1)",
            fill: "#fff",
          },
          "&:hover": {
            borderColor: "#fff",
            backgroundColor: "transparent",
            color: "#000",
            "&:before, &:after": {
              width: "100%",
            },
            "& svg": {
              fill: "#000",
            },
          },
        },
        contained: {
          borderRadius: 0,
          padding: "13px 23px",
          border: "1px solid rgba(255,255,255, .5)",
          backgroundColor: "#fff",
          lineHeight: 1,
          color: "#000",
          "&:hover": {
            color: "#000",
            backgroundColor: "rgba(255,255,255, .9)",
          },
        },
        text: {
          textTransform: "none",
          padding: 0,
          minWidth: "initial",
          "&:hover .MuiButton-endIcon": {
            transform: "translateX(4px)",
          },
        },
        endIcon: {
          marginLeft: 9,
          transition: "250ms cubic-bezier(0.4, 0, 0.2, 1)",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          background: "transparent",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: "1px solid rgba(255, 255, 255, .3)",
          padding: "10px 25px",
          fontWeight: 300,
          fontSize: 12,
          fontFamily: ["IBM Plex Mono", "Helvetica", "Arial"].join(","),
        },
        head: {
          fontFamily: ["Chakra petch", "Helvetica", "Arial"].join(","),
          fontSize: 16,
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        input: {
          // border: "1px solid rgba(255, 255, 255, .3)",
          fontFamily: ["IBM Plex Mono", "Helvetica", "Arial"].join(","),
          fontWeight: 600,
          fontSize: 12,
          borderRadius: 0,
        },
      },
    },
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: {
          border: "1px solid rgba(255, 255, 255, .5)",
          borderRadius: 0,
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        outlined: {
          padding: "12.5px 14px",
          border: 0,
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          fontFamily: ["IBM Plex Mono", "Helvetica", "Arial"].join(","),
          fontSize: 12,
          fontWeight: 600,
          textTransform: "none",
          borderRadius: 0,
        },
      },
    },
  },
});
theme = responsiveFontSizes(theme);

const TopLayout = ({ children }) => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    {children}
  </ThemeProvider>
);

export default TopLayout;
