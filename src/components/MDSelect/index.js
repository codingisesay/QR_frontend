
// components/MDSelect/index.js
import React, { forwardRef } from "react";
import PropTypes from "prop-types";
import MDInputRoot from "components/MDInput/MDInputRoot";

/**
 * MDSelect
 * --------
 * A thin wrapper around MDInputRoot (styled MUI TextField) with `select` enabled.
 * This ensures the exact same look & states (focus/error/disabled) as MDInput,
 * and also normalizes the select trigger padding/height for size="small".
 *
 * Usage:
 * <MDSelect label="Type" value={value} onChange={...} size="small">
 *   <MenuItem value="standard">Standard</MenuItem>
 *   <MenuItem value="composite">Composite</MenuItem>
 * </MDSelect>
 */
const MDSelect = forwardRef(function MDSelect(
  { error, success, disabled, fullWidth = true, size = "small", sx = {}, SelectProps, ...props },
  ref
) {
  return (
    <MDInputRoot
      ref={ref}
      select
      variant="outlined"
      size={size}
      fullWidth={fullWidth}
      // Keep the menu feeling native to the rest of your theme
      SelectProps={{
        MenuProps: { PaperProps: { elevation: 3 } },
        ...SelectProps,
      }}
      ownerState={{ error, success, disabled }}
      sx={{
        // Match the same rounded corners as your MDInput
        "& .MuiOutlinedInput-root": { borderRadius: "8px" },
        // Normalize the select trigger content (same vertical rhythm as inputs)
        "& .MuiSelect-select": {
          display: "flex",
          alignItems: "center",
          paddingTop: "10px",
          paddingBottom: "10px",
        },
        // Ensure small height parity with your inputs.
        "& .MuiOutlinedInput-root.MuiInputBase-sizeSmall": { height: 44 },
        // In case some places rely on input selector rules
        "& .MuiInputBase-input": {
          paddingTop: "10px",
          paddingBottom: "10px",
        },
        ...sx,
      }}
      {...props}
    />
  );
});

MDSelect.propTypes = {
  error: PropTypes.bool,
  success: PropTypes.bool,
  disabled: PropTypes.bool,
  fullWidth: PropTypes.bool,
  size: PropTypes.oneOf(["small", "medium"]),
  sx: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  SelectProps: PropTypes.object,
};

export default MDSelect;
