import TextField from "@mui/material/TextField";

export default function MDSelect({ sx = {}, ...props }) {
  return (
    <TextField
      select
      variant="outlined"
      size="small"
      fullWidth
      SelectProps={{
        MenuProps: { PaperProps: { elevation: 3 } }, // subtle menu style
      }}
      sx={{
        minWidth: 180,
        // match MDInput look/feel
        "& .MuiOutlinedInput-root": {
          borderRadius: "8px",
        },
        "& .MuiInputBase-input": {
          paddingTop: "10px",
          paddingBottom: "10px",
        },
        ...sx,
      }}
      {...props}
    />
  );
}
