import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { useStore } from "../lib/store.jsx";
import { categoryFor, validate } from "../lib/cost.js";
import { BUSINESS_UNITS, INDIA_WORK_LOCATIONS } from "../data/reference.js";
import WonBuilderAiAssist from "../components/WonBuilderAiAssist.jsx";
import PageHeader from "../ui/PageHeader.jsx";

// slotProps shared by the project start/end month fields.
const monthSlots = (min, max) => ({
  inputLabel: { shrink: true },
  htmlInput: { min, max },
});

let rowSeq = 0;

function monthIndex(calendar, month) {
  return calendar.findIndex((item) => item.month === month);
}

function clampMonthIndex(calendar, index) {
  return Math.min(calendar.length - 1, Math.max(0, index));
}

function clampMonthToRange(calendar, month, rangeStart, rangeEnd) {
  const idx = monthIndex(calendar, month);
  const start = monthIndex(calendar, rangeStart);
  const end = monthIndex(calendar, rangeEnd);
  if (idx < 0 || start < 0 || end < 0) return rangeStart || calendar[0]?.month || month;
  const lo = Math.min(start, end);
  const hi = Math.max(start, end);
  return calendar[Math.min(hi, Math.max(lo, idx))]?.month || rangeStart;
}

function monthsBetween(calendar, startMonth, endMonth) {
  const start = monthIndex(calendar, startMonth);
  const end = monthIndex(calendar, endMonth);
  if (start < 0 || end < 0) return 1;
  return Math.max(1, end - start + 1);
}

function endMonthFor(allocation, calendar) {
  const start = monthIndex(calendar, allocation.startMonth || calendar[0]?.month);
  if (start < 0) return calendar[0]?.month || "";
  const months = Math.max(1, Math.ceil(Number(allocation.months) || 1));
  return calendar[clampMonthIndex(calendar, start + months - 1)]?.month || allocation.startMonth || "";
}

function dateToMonth(value) {
  return typeof value === "string" && /^\d{4}-\d{2}/.test(value) ? value.slice(0, 7) : "";
}

function monthToStartDate(month) {
  return month ? `${month}-01` : "";
}

function monthToEndDate(month) {
  if (!month) return "";
  const [year, m] = month.split("-").map(Number);
  if (!year || !m) return "";
  const day = new Date(year, m, 0).getDate();
  return `${month}-${String(day).padStart(2, "0")}`;
}

function calendarMonthBounds(calendar) {
  const start = calendar[0]?.month || "";
  const end = calendar[calendar.length - 1]?.month || start;
  return { min: start, max: end };
}

function withAllocationDates(allocation, calendar, startMonth, endMonth) {
  return {
    ...allocation,
    startMonth,
    months: monthsBetween(calendar, startMonth, endMonth),
  };
}

function clampAllocationToProject(allocation, calendar, projectStart, projectEnd) {
  let startMonth = clampMonthToRange(calendar, allocation.startMonth || projectStart, projectStart, projectEnd);
  let endMonth = clampMonthToRange(calendar, endMonthFor(allocation, calendar), projectStart, projectEnd);
  if (monthIndex(calendar, endMonth) < monthIndex(calendar, startMonth)) endMonth = startMonth;
  return withAllocationDates(allocation, calendar, startMonth, endMonth);
}

const blankRow = (startMonth = "2026-07", endMonth = startMonth, calendar = [{ month: startMonth }]) => ({
  id: `r${Date.now()}_${rowSeq++}`,
  role: "",
  category: "ASE",
  country: "India",
  workLocation: "",
  businessUnit: "",
  startMonth,
  count: 1,
  months: monthsBetween(calendar, startMonth, endMonth),
});

function expandAllocations(allocations) {
  return allocations.flatMap((allocation) => {
    const count = Math.min(Math.max(Math.round(Number(allocation.count)) || 1, 1), 100);
    return Array.from({ length: count }, (_, i) => ({
      ...allocation,
      id: count === 1 ? allocation.id : `${allocation.id}_${i + 1}`,
      count: 1,
    }));
  });
}

function datesFromAllocations(allocations, calendar) {
  const scheduled = allocations
    .map((allocation) => {
      const start = calendar.findIndex((month) => month.month === allocation.startMonth);
      if (start < 0) return null;
      return { start, end: start + Math.max(1, Math.ceil(Number(allocation.months) || 1)) - 1 };
    })
    .filter(Boolean);
  if (!scheduled.length) return { startMonth: calendar[0].month, endMonth: calendar[0].month };
  const start = Math.min(...scheduled.map((item) => item.start));
  const end = Math.min(calendar.length - 1, Math.max(...scheduled.map((item) => item.end)));
  return { startMonth: calendar[start].month, endMonth: calendar[end].month };
}

// Wrapper so the form fully resets when switching between WONs.
export default function WonBuilder() {
  const { id } = useParams();
  return <Builder key={id} id={id} />;
}

function Builder({ id }) {
  const { wons, rateCard, saveWon } = useStore();
  const navigate = useNavigate();
  const existing = id === "new" ? null : wons.find((w) => w.id === id);
  const categories = rateCard.roles;
  const savedAllocations = existing
    ? JSON.parse(JSON.stringify(existing.versions[existing.versions.length - 1].allocations))
    : null;
  const initialDates = existing
    ? {
        ...datesFromAllocations(savedAllocations, rateCard.calendar),
        startMonth: existing.startMonth || datesFromAllocations(savedAllocations, rateCard.calendar).startMonth,
        endMonth: existing.endMonth || datesFromAllocations(savedAllocations, rateCard.calendar).endMonth,
      }
    : { startMonth: rateCard.calendar[0].month, endMonth: rateCard.calendar[11].month };
  const initialDuration =
    rateCard.calendar.findIndex((month) => month.month === initialDates.endMonth) -
      rateCard.calendar.findIndex((month) => month.month === initialDates.startMonth) +
    1;

  const [form, setForm] = useState(() =>
    existing
      ? {
          id: existing.id,
          name: existing.name || existing.title || "",
          referenceWonNumber: existing.referenceWonNumber || "",
          contractId: existing.contractId || "",
          contractValue: existing.contractValue ?? "",
          contractValueCurrency: existing.contractValueCurrency || "INR",
          ...initialDates,
          status: existing.status,
          allocations: expandAllocations(
            savedAllocations.map((allocation) =>
              clampAllocationToProject(
                {
                  ...allocation,
                  category: categoryFor(allocation) || "ASE",
                  country: allocation.country || "India",
                  workLocation: allocation.workLocation || "",
                  businessUnit: allocation.businessUnit || "",
                  startMonth: allocation.startMonth || initialDates.startMonth,
                  months: Math.max(1, Math.ceil(Number(allocation.months) || initialDuration)),
                },
                rateCard.calendar,
                initialDates.startMonth,
                initialDates.endMonth
              )
            )
          ),
        }
      : {
          id: null,
          name: "",
          referenceWonNumber: "",
          contractId: "",
          contractValue: "",
          contractValueCurrency: "INR",
          ...initialDates,
          status: "Draft",
          allocations: [blankRow(initialDates.startMonth, initialDates.endMonth, rateCard.calendar)],
        }
  );
  const [showErrors, setShowErrors] = useState(false);

  const issues = useMemo(
    () => validate(form.allocations, rateCard, 0),
    [form.allocations, rateCard]
  );

  if (id !== "new" && !existing) {
    return (
      <Box>
        <PageHeader title="Work order not found" />
        <Button component={Link} to="/won" variant="outlined">
          Back to work orders
        </Button>
      </Box>
    );
  }

  const set = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
  };
  const setRow = (rowId, patch) =>
    set({
      allocations: form.allocations.map((a) => (a.id === rowId ? { ...a, ...patch } : a)),
    });
  const calendarBounds = useMemo(() => calendarMonthBounds(rateCard.calendar), [rateCard.calendar]);
  const projectBounds = useMemo(
    () => ({
      min: form.startMonth,
      max: form.endMonth,
    }),
    [form.startMonth, form.endMonth]
  );

  const setAllocationMonth = (rowId, field, value) => {
    const monthValue = dateToMonth(value) || value;
    set({
      allocations: form.allocations.map((allocation) => {
        if (allocation.id !== rowId) return allocation;
        let startMonth = field === "startMonth" ? monthValue : allocation.startMonth;
        let endMonth = field === "endMonth" ? monthValue : endMonthFor(allocation, rateCard.calendar);
        startMonth = clampMonthToRange(rateCard.calendar, startMonth, form.startMonth, form.endMonth);
        endMonth = clampMonthToRange(rateCard.calendar, endMonth, form.startMonth, form.endMonth);
        let startIndex = monthIndex(rateCard.calendar, startMonth);
        let endIndex = monthIndex(rateCard.calendar, endMonth);
        if (startIndex < 0 || endIndex < 0) return allocation;
        if (startIndex > endIndex) {
          if (field === "startMonth") {
            endMonth = startMonth;
          } else {
            startMonth = endMonth;
          }
        }
        return withAllocationDates(allocation, rateCard.calendar, startMonth, endMonth);
      }),
    });
  };
  const addRow = () => {
    set({
      allocations: [
        ...form.allocations,
        blankRow(form.startMonth, form.endMonth, rateCard.calendar),
      ],
    });
  };
  const removeRow = (rowId) =>
    set({ allocations: form.allocations.filter((a) => a.id !== rowId) });

  function setProjectMonth(field, value) {
    const monthValue = dateToMonth(value) || value;
    const oldStart = form.startMonth;
    const oldEnd = form.endMonth;
    let startMonth = field === "startMonth" ? monthValue : oldStart;
    let endMonth = field === "endMonth" ? monthValue : oldEnd;
    let startIndex = rateCard.calendar.findIndex((month) => month.month === startMonth);
    let endIndex = rateCard.calendar.findIndex((month) => month.month === endMonth);
    if (startIndex > endIndex) {
      if (field === "startMonth") {
        endMonth = startMonth;
        endIndex = startIndex;
      } else {
        startMonth = endMonth;
        startIndex = endIndex;
      }
    }
    set({
      startMonth,
      endMonth,
      allocations: form.allocations.map((allocation) => {
        const rowStart = allocation.startMonth || oldStart;
        const rowEnd = endMonthFor(allocation, rateCard.calendar);
        const trackedStart = rowStart === oldStart;
        const trackedEnd = rowEnd === oldEnd;
        let nextStart = trackedStart
          ? startMonth
          : clampMonthToRange(rateCard.calendar, rowStart, startMonth, endMonth);
        let nextEnd = trackedEnd ? endMonth : clampMonthToRange(rateCard.calendar, rowEnd, startMonth, endMonth);
        nextStart = clampMonthToRange(rateCard.calendar, nextStart, startMonth, endMonth);
        nextEnd = clampMonthToRange(rateCard.calendar, nextEnd, startMonth, endMonth);
        if (monthIndex(rateCard.calendar, nextEnd) < monthIndex(rateCard.calendar, nextStart)) {
          if (trackedEnd && !trackedStart) nextEnd = nextStart;
          else nextStart = nextEnd;
        }
        return withAllocationDates(allocation, rateCard.calendar, nextStart, nextEnd);
      }),
    });
  }

  function onSave() {
    const blocking = issues.filter((i) => i.level === "error");
    if (!form.name.trim()) {
      setShowErrors(true);
      return;
    }
    if (blocking.length) {
      setShowErrors(true);
      return;
    }
    saveWon(form);
    setShowErrors(false);
    navigate("/won", { replace: true });
  }

  const selectProps = { select: { displayEmpty: true } };
  const projectMonthSlots = monthSlots(calendarBounds.min, calendarBounds.max);

  return (
    <Box>
      <PageHeader
        title={existing ? existing.number : "New work order"}
        subtitle={!existing ? "The WON number is issued when you save." : undefined}
        actions={
          <>
            <Button component={Link} to="/won" variant="outlined" color="inherit">
              Cancel
            </Button>
            <Button variant="contained" onClick={onSave}>
              {existing ? "Save changes" : "Create"}
            </Button>
          </>
        }
      />

      {showErrors && !form.name.trim() && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Enter a WON name.
        </Alert>
      )}

      <Stack spacing={2.5}>
        <Card>
          <CardContent>
            <Box
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" },
              }}
            >
              <TextField
                label="WON name"
                value={form.name}
                onChange={(e) => set({ name: e.target.value })}
                placeholder="Work order name"
                error={showErrors && !form.name.trim()}
              />
              <TextField
                label="Reference WON number"
                value={form.referenceWonNumber}
                onChange={(e) => set({ referenceWonNumber: e.target.value })}
                placeholder="External reference"
              />
              <TextField
                label="Contract ID"
                value={form.contractId}
                onChange={(e) => set({ contractId: e.target.value })}
                placeholder="Contract identifier"
              />
              <TextField
                label="Contract value"
                type="number"
                value={form.contractValue}
                onChange={(e) => set({ contractValue: e.target.value })}
                placeholder="Contract value"
                slotProps={{ htmlInput: { min: 0, step: 1000 } }}
              />
              <TextField
                select
                label="Contract value currency"
                value={form.contractValueCurrency}
                onChange={(e) => set({ contractValueCurrency: e.target.value })}
              >
                {["INR", "USD", "CAD", "AUD", "GBP"].map((currency) => (
                  <MenuItem key={currency} value={currency}>
                    {currency}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Start month"
                type="month"
                value={form.startMonth || ""}
                onChange={(e) => setProjectMonth("startMonth", e.target.value)}
                slotProps={projectMonthSlots}
              />
              <TextField
                label="End month"
                type="month"
                value={form.endMonth || ""}
                onChange={(e) => setProjectMonth("endMonth", e.target.value)}
                slotProps={projectMonthSlots}
              />
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Typography variant="h2">Resource allocation</Typography>
              <Button variant="outlined" startIcon={<AddIcon />} onClick={addRow}>
                Add row
              </Button>
            </Stack>
            <Card>
              <TableContainer sx={{ overflowX: "visible" }}>
                <Table
                  size="small"
                  sx={{
                    tableLayout: "fixed",
                    width: "100%",
                    "& th, & td": { px: 1, py: 1, verticalAlign: "top" },
                    "& th": { whiteSpace: "normal", lineHeight: 1.2 },
                  }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: "18%" }}>Role</TableCell>
                      <TableCell sx={{ width: "12%" }}>Category</TableCell>
                      <TableCell sx={{ width: "11%" }}>Country</TableCell>
                      <TableCell sx={{ width: "15%" }}>Work location</TableCell>
                      <TableCell sx={{ width: "14%" }}>Business Unit</TableCell>
                      <TableCell sx={{ width: "13%" }}>Start month</TableCell>
                      <TableCell sx={{ width: "13%" }}>End month</TableCell>
                      <TableCell sx={{ width: 48, px: 0.5 }} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {form.allocations.map((a, rowIndex) => {
                      const rowStart = clampMonthToRange(rateCard.calendar, a.startMonth, form.startMonth, form.endMonth) || a.startMonth;
                      const rowEnd = clampMonthToRange(rateCard.calendar, endMonthFor(a, rateCard.calendar), form.startMonth, form.endMonth);
                      const startIndex = rateCard.calendar.findIndex((month) => month.month === a.startMonth);
                      const invalidRole = showErrors && !a.role.trim();
                      const invalidWorkLocation = showErrors && a.country === "India" && !a.workLocation;
                      const invalidBusinessUnit = showErrors && !a.businessUnit;
                      const invalidStart = showErrors && rateCard.calendar.length > 0 && !rateCard.calendar.some((month) => month.month === a.startMonth);
                      const invalidMonths = showErrors && !(Number(a.months) > 0);
                      const invalidDuration = showErrors && startIndex >= 0 && startIndex + Number(a.months) > rateCard.calendar.length;
                      const invalidStartOrEnd = invalidStart || invalidMonths || invalidDuration;
                      return (
                        <TableRow key={a.id}>
                          <TableCell>
                            <TextField
                              fullWidth
                              value={a.role}
                              placeholder="e.g. Senior Engineer"
                              onChange={(e) => setRow(a.id, { role: e.target.value })}
                              error={invalidRole}
                              slotProps={{ htmlInput: { "aria-label": `Role for row ${rowIndex + 1}` } }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              select
                              fullWidth
                              value={a.category}
                              onChange={(e) => setRow(a.id, { category: e.target.value })}
                            >
                              {categories.map((category) => (
                                <MenuItem key={category.id} value={category.id}>
                                  {category.title}
                                </MenuItem>
                              ))}
                            </TextField>
                          </TableCell>
                          <TableCell>
                            <TextField
                              select
                              fullWidth
                              value={a.country}
                              onChange={(e) => setRow(a.id, { country: e.target.value, workLocation: "" })}
                            >
                              {rateCard.countries.map((country) => (
                                <MenuItem key={country} value={country}>
                                  {country}
                                </MenuItem>
                              ))}
                            </TextField>
                          </TableCell>
                          <TableCell>
                            {a.country === "India" && (
                              <TextField
                                select
                                fullWidth
                                value={a.workLocation}
                                onChange={(e) => setRow(a.id, { workLocation: e.target.value })}
                                error={invalidWorkLocation}
                                slotProps={{
                                  ...selectProps,
                                  htmlInput: { "aria-label": `Work location for ${a.role || "allocation row"}` },
                                }}
                              >
                                <MenuItem value="">
                                  <em>Choose work location</em>
                                </MenuItem>
                                {INDIA_WORK_LOCATIONS.map((location) => (
                                  <MenuItem key={location} value={location}>
                                    {location}
                                  </MenuItem>
                                ))}
                              </TextField>
                            )}
                          </TableCell>
                          <TableCell>
                            <TextField
                              select
                              fullWidth
                              value={a.businessUnit}
                              onChange={(e) => setRow(a.id, { businessUnit: e.target.value })}
                              error={invalidBusinessUnit}
                              slotProps={{
                                ...selectProps,
                                htmlInput: { "aria-label": `Business Unit for ${a.role || "allocation row"}` },
                              }}
                            >
                              <MenuItem value="">
                                <em>Select Business Unit</em>
                              </MenuItem>
                              {BUSINESS_UNITS.map((businessUnit) => (
                                <MenuItem key={businessUnit} value={businessUnit}>
                                  {businessUnit}
                                </MenuItem>
                              ))}
                            </TextField>
                          </TableCell>
                          <TableCell>
                            <TextField
                              type="month"
                              fullWidth
                              value={rowStart || ""}
                              onChange={(e) => setAllocationMonth(a.id, "startMonth", e.target.value)}
                              error={invalidStartOrEnd}
                              slotProps={{
                                htmlInput: {
                                  min: projectBounds.min,
                                  max: projectBounds.max,
                                  "aria-label": `Start month for ${a.role || "allocation row"}`,
                                },
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              type="month"
                              fullWidth
                              value={rowEnd || ""}
                              onChange={(e) => setAllocationMonth(a.id, "endMonth", e.target.value)}
                              error={invalidStartOrEnd}
                              slotProps={{
                                htmlInput: {
                                  min: projectBounds.min,
                                  max: projectBounds.max,
                                  "aria-label": `End month for ${a.role || "allocation row"}`,
                                },
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ px: 0.5 }}>
                            <IconButton aria-label="Remove row" title="Remove row" onClick={() => removeRow(a.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {form.allocations.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ color: "text.secondary", py: 4 }}>
                          No rows. Add one, or use AI assist.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>

            {showErrors && form.allocations.length === 0 && (
              <Alert severity="error" sx={{ mt: 2 }}>
                Add at least one allocation.
              </Alert>
            )}
          </CardContent>
        </Card>

        <WonBuilderAiAssist
          form={form}
          existing={existing}
          rateCard={rateCard}
          setForm={set}
          blankRow={blankRow}
        />
      </Stack>
    </Box>
  );
}
