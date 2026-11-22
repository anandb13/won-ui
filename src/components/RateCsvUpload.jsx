import { useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import { parseRateCsv, ratesToCsv } from "../lib/rateCsv.js";

const MAX_BYTES = 1024 * 1024;
const MAX_SHOWN = 50;
const fmt = (n) => Number(n).toLocaleString("en-IN");
const failed = (fileName, message) => ({
  fileName,
  result: { changes: [], unchanged: 0, warnings: [], errors: [message] },
});

// Upload a CSV to update "Daily cost by category and country (INR)".
// Flow: choose file -> preview every change (nothing applied yet) -> Apply or Cancel.
export default function RateCsvUpload({ rateCard, onApply }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null); // { fileName, result }
  const [message, setMessage] = useState("");

  function download() {
    const blob = new Blob([ratesToCsv(rateCard)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "daily-cost-by-category-and-country.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // lets the same file be chosen again after a fix
    if (!file) return;
    setMessage("");
    if (file.size > MAX_BYTES) {
      setPreview(failed(file.name, "The file is larger than 1 MB."));
      return;
    }
    try {
      const text = await file.text();
      setPreview({ fileName: file.name, result: parseRateCsv(text, rateCard) });
    } catch {
      setPreview(failed(file.name, "The file could not be read."));
    }
  }

  function apply() {
    const { changes } = preview.result;
    onApply(changes);
    setMessage(
      `Updated ${changes.length} rate${changes.length === 1 ? "" : "s"} from ${preview.fileName}. Calculations for existing work orders now use the current reference values.`
    );
    setPreview(null);
  }

  const result = preview?.result;
  const blocked = !result || result.errors.length > 0 || result.changes.length === 0;

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={1.5}
        >
          <Typography variant="h2">Update rates from CSV</Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={download}>
              Download current CSV
            </Button>
            <Button variant="contained" startIcon={<FileUploadIcon />} onClick={() => inputRef.current?.click()}>
              Upload CSV
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              style={{ display: "none" }}
              onChange={onFile}
              aria-label="Upload rates CSV"
            />
          </Stack>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Columns: Category, then one column per country ({rateCard.countries.join(", ")}). Values are
          daily cost in INR. Blank cells keep the current value. Only existing categories and countries
          are accepted. Tip: download the current CSV, edit it, and upload it back.
        </Typography>

        <Box aria-live="polite">
          {message && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {message}
            </Alert>
          )}
          {result && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>{preview.fileName}</strong>:{" "}
                {result.errors.length === 0
                  ? `${result.changes.length} rate${result.changes.length === 1 ? "" : "s"} will change, ${result.unchanged} unchanged.`
                  : "this file cannot be applied. Fix the problems below and upload it again."}
              </Typography>

              {result.errors.length > 0 && (
                <Alert severity="error" sx={{ mb: 1.5 }}>
                  <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                    {result.errors.slice(0, 20).map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                    {result.errors.length > 20 && <li>and {result.errors.length - 20} more problems</li>}
                  </Box>
                </Alert>
              )}
              {result.warnings.length > 0 && (
                <Alert severity="warning" sx={{ mb: 1.5 }}>
                  <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                    {result.warnings.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </Box>
                </Alert>
              )}

              {result.errors.length === 0 && result.changes.length > 0 && (
                <>
                  <Card sx={{ mb: 1.5 }}>
                    <TableContainer sx={{ maxHeight: 320 }}>
                      <Table stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell>Category</TableCell>
                            <TableCell>Country</TableCell>
                            <TableCell align="right">Current</TableCell>
                            <TableCell align="right">New</TableCell>
                            <TableCell align="right">Change</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {result.changes.slice(0, MAX_SHOWN).map((c) => {
                            const pct = c.oldRate ? ((c.newRate - c.oldRate) / c.oldRate) * 100 : null;
                            return (
                              <TableRow key={c.category + c.country}>
                                <TableCell>{c.category}</TableCell>
                                <TableCell>{c.country}</TableCell>
                                <TableCell align="right">{fmt(c.oldRate)}</TableCell>
                                <TableCell align="right">
                                  <strong>{fmt(c.newRate)}</strong>
                                </TableCell>
                                <TableCell align="right">
                                  {pct == null ? "new" : `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Card>
                  {result.changes.length > MAX_SHOWN && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                      and {result.changes.length - MAX_SHOWN} more changes
                    </Typography>
                  )}
                </>
              )}

              <Stack direction="row" spacing={1}>
                <Button variant="contained" disabled={blocked} onClick={apply}>
                  Apply {result.changes.length || ""} change{result.changes.length === 1 ? "" : "s"}
                </Button>
                <Button variant="outlined" color="inherit" onClick={() => setPreview(null)}>
                  Cancel
                </Button>
              </Stack>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
