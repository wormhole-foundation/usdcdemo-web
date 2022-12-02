import { Box, Button, CircularProgress, Typography } from "@mui/material";
import React from "react";

export default function ButtonWithLoader({
  disabled,
  onClick,
  showLoader,
  error,
  children,
}: {
  disabled?: boolean;
  onClick: () => void;
  showLoader?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Box sx={{ position: "relative" }}>
        <Button
          color="primary"
          variant="contained"
          sx={{ marginTop: 2, width: "100%" }}
          disabled={disabled}
          onClick={onClick}
        >
          {children}
        </Button>
        {showLoader ? (
          <CircularProgress
            size={22}
            color="inherit"
            sx={{
              position: "absolute",
              bottom: 0,
              left: "50%",
              marginLeft: "-12px",
              marginBottom: "9px",
            }}
          />
        ) : null}
      </Box>
      {error ? (
        <Typography
          variant="body2"
          color="error"
          sx={{ marginTop: 1, textAlign: "center" }}
        >
          {error}
        </Typography>
      ) : null}
    </>
  );
}
