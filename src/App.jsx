import { useState } from "react";
import { Link as RouterLink, Navigate, Route, Routes, useMatch } from "react-router-dom";
import {
  AppBar,
  Box,
  Container,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import DescriptionIcon from "@mui/icons-material/Description";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import PaidIcon from "@mui/icons-material/Paid";
import Dashboard from "./pages/Dashboard.jsx";
import WonList from "./pages/WonList.jsx";
import WonBuilder from "./pages/WonBuilder.jsx";
import Calculation from "./pages/Calculation.jsx";
import RateCard from "./pages/RateCard.jsx";

const DRAWER_WIDTH = 232;

const NAV = [
  { to: "/", label: "Dashboard", end: true, icon: DashboardIcon },
  { to: "/won", label: "Work orders", end: true, icon: DescriptionIcon },
  { to: "/won/new", label: "New WON", icon: AddCircleOutlineIcon },
  { to: "/rates", label: "Rate card", icon: PaidIcon },
];

function NavItem({ item, onNavigate }) {
  const match = useMatch({ path: item.to, end: Boolean(item.end) });
  const Icon = item.icon;
  return (
    <ListItemButton
      component={RouterLink}
      to={item.to}
      selected={Boolean(match)}
      onClick={onNavigate}
      sx={{ borderRadius: 1, mb: 0.5 }}
    >
      <ListItemIcon sx={{ minWidth: 36, color: match ? "primary.main" : "inherit" }}>
        <Icon fontSize="small" />
      </ListItemIcon>
      <ListItemText primary={item.label} slotProps={{ primary: { sx: { fontWeight: match ? 600 : 400 } } }} />
    </ListItemButton>
  );
}

export default function App() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const [mobileOpen, setMobileOpen] = useState(false);

  const drawer = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Toolbar>
        <Typography variant="h6" color="primary" sx={{ fontWeight: 700 }}>
          WON Builder
        </Typography>
      </Toolbar>
      <List sx={{ px: 1.5 }}>
        {NAV.map((item) => (
          <NavItem key={item.to} item={item} onNavigate={() => setMobileOpen(false)} />
        ))}
      </List>
      <Typography variant="caption" color="text.secondary" sx={{ mt: "auto", p: 2 }}>
        Workbook rates and work orders are stored in this browser only.
      </Typography>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {!isDesktop && (
        <AppBar
          position="fixed"
          elevation={0}
          sx={{ bgcolor: "background.paper", color: "text.primary", borderBottom: 1, borderColor: "divider" }}
        >
          <Toolbar>
            <IconButton edge="start" aria-label="Open navigation" onClick={() => setMobileOpen(true)} sx={{ mr: 1 }}>
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" color="primary" sx={{ fontWeight: 700 }}>
              WON Builder
            </Typography>
          </Toolbar>
        </AppBar>
      )}

      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant={isDesktop ? "permanent" : "temporary"}
          open={isDesktop ? true : mobileOpen}
          onClose={() => setMobileOpen(false)}
          sx={{ "& .MuiDrawer-paper": { width: DRAWER_WIDTH, boxSizing: "border-box" } }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, p: { xs: 2, md: 3 }, pt: { xs: 10, md: 3 } }}>
        <Container maxWidth="xl" disableGutters>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/won" element={<WonList />} />
            <Route path="/won/:id/calculation" element={<Calculation />} />
            <Route path="/won/:id" element={<WonBuilder />} />
            <Route path="/rates" element={<RateCard />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Container>
      </Box>
    </Box>
  );
}
