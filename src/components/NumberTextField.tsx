import {
  Button,
  InputAdornment,
  TextField,
  TextFieldProps,
} from "@mui/material";
import React from "react";

export default function NumberTextField({
  onMaxClick,
  ...props
}: TextFieldProps & { onMaxClick?: () => void }) {
  return (
    <TextField
      type="number"
      {...props}
      sx={{
        "& .MuiInputBase-input": (theme) => ({
          ...theme.typography.body1,
          pt: "18px",
        }),
        "& .MuiInputBase-input.Mui-disabled": {
          WebkitTextFillColor: "#fff",
        },
        ...(props.sx || {}),
      }}
      InputLabelProps={{
        style: { color: "#fff" },
      }}
      InputProps={{
        endAdornment: onMaxClick ? (
          <InputAdornment position="end">
            <Button
              onClick={onMaxClick}
              disabled={props.disabled}
              sx={{ height: 32 }}
            >
              Max
            </Button>
          </InputAdornment>
        ) : undefined,
        ...(props?.InputProps || {}),
      }}
    ></TextField>
  );
}
