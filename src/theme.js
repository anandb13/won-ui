import { createTheme } from "@mui/material/styles";

// Palette carried over from the previous hand-written CSS.
const theme = createTheme({
  palette: {
    primary: { main: "#0f766e", dark: "#0b5c56" },
    secondary: { main: "#667085" },
    warning: { main: "#b45309" },
    error: { main: "#b42318" },
    success: { main: "#067647" },
    background: { default: "#f6f7f9", paper: "#ffffff" },
    text: { primary: "#1c2430", secondary: "#667085" },
    divider: "#e2e5ea",
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    fontSize: 14,
    h1: { fontSize: "1.5rem", fontWeight: 600, lineHeight: 1.3 },
    h2: { fontSize: "1.05rem", fontWeight: 600, lineHeight: 1.4 },
    h3: {
      fontSize: "0.8rem",
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: "0.04em",
      lineHeight: 1.4,
    },
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiCard: { defaultProps: { variant: "outlined" } },
    MuiTextField: { defaultProps: { size: "small" } },
    MuiTable: { defaultProps: { size: "small" } },
    MuiTableCell: {
      styleOverrides: {
        head: { fontWeight: 600, backgroundColor: "#f6f7f9", whiteSpace: "nowrap" },
      },
    },
  },
});

export default theme;
