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
        ...(props.sx || {}),
      }}
      InputProps={{
        endAdornment: onMaxClick ? (
          <InputAdornment position="end">
            <Button
              onClick={onMaxClick}
              disabled={props.disabled}
              variant="outlined"
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
