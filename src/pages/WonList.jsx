import { useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  InputAdornment,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { monthLabel } from "../data/reference.js";
import { useStore } from "../lib/store.jsx";
import PageHeader from "../ui/PageHeader.jsx";

const currencyLocales = {
  INR: "en-IN",
  USD: "en-US",
  CAD: "en-CA",
  AUD: "en-AU",
  GBP: "en-GB",
};

function formatContractValue(amount, currency) {
  if (amount === "" || amount == null) return "-";
  return new Intl.NumberFormat(currencyLocales[currency] || "en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
}

function formatPeriod(startMonth, endMonth) {
  if (!startMonth || !endMonth) return "-";
  return `${monthLabel(startMonth)} - ${monthLabel(endMonth)}`;
}

export default function WonList() {
  const { wons, deleteWon } = useStore();
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return wons.filter((w) =>
      !term || [w.contractId, w.name || w.title]
        .some((value) => (value || "").toLowerCase().includes(term))
    );
  }, [wons, q]);

  return (
    <Box>
      <PageHeader
        title="Work orders"
        actions={
          <Button component={RouterLink} to="/won/new" variant="contained">
            New WON
          </Button>
        }
      />

      <TextField
        placeholder="Search Contract ID or WON name"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        sx={{ mb: 2, width: { xs: "100%", sm: 360 }, bgcolor: "background.paper" }}
        slotProps={{
          htmlInput: { "aria-label": "Search Contract ID or WON name" },
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell align="right">#</TableCell>
                <TableCell>Contract ID</TableCell>
                <TableCell>WON name</TableCell>
                <TableCell>Contract value</TableCell>
                <TableCell>Period</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((w, index) => (
                <TableRow key={w.id} hover>
                  <TableCell align="right">{index + 1}</TableCell>
                  <TableCell>{w.contractId || "-"}</TableCell>
                  <TableCell>
                    <Link component={RouterLink} to={`/won/${w.id}/calculation`} underline="hover">
                      {w.name || w.title}
                    </Link>
                  </TableCell>
                  <TableCell>{formatContractValue(w.contractValue, w.contractValueCurrency)}</TableCell>
                  <TableCell>{formatPeriod(w.startMonth, w.endMonth)}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Button component={RouterLink} to={`/won/${w.id}`} size="small" variant="outlined">
                        Edit
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={() => {
                          if (window.confirm(`Delete ${w.name || w.title}? This cannot be undone.`)) {
                            deleteWon(w.id);
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ color: "text.secondary", py: 4 }}>
                    No work orders match.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
}
