import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useStore } from "../lib/store.jsx";
import { categoryFor, inr, lineCost } from "../lib/cost.js";
import { monthLabel } from "../data/reference.js";
import PageHeader from "../ui/PageHeader.jsx";

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

function allocationEndMonth(allocation, calendar) {
  const start = calendar.findIndex((month) => month.month === allocation.startMonth);
  if (start < 0) return "";
  const months = Math.max(1, Math.ceil(Number(allocation.months) || 1));
  return calendar[Math.min(calendar.length - 1, start + months - 1)]?.month || allocation.startMonth || "";
}

const currencyLocales = {
  INR: "en-IN",
  USD: "en-US",
  CAD: "en-CA",
  AUD: "en-AU",
  GBP: "en-GB",
};

function formatContractValue(amount, currency) {
  return new Intl.NumberFormat(currencyLocales[currency] || "en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
}

function gradeLabel(allocation, roles) {
  const category = categoryFor(allocation);
  return roles.find((role) => role.id === category)?.title || category || "-";
}

function dailyRateInr(allocation, rateCard) {
  const rate = rateCard.dailyRates?.[categoryFor(allocation)]?.[allocation.country];
  return rate == null ? "-" : inr(rate);
}

function milestoneDimensionFor(allocation) {
  const workLocation = allocation.workLocation || allocation.country || "-";
  const businessUnit = allocation.businessUnit || "-";
  return {
    key: `${workLocation}\u0000${businessUnit}`,
    label: businessUnit === "ADM" || businessUnit === "-"
      ? workLocation
      : `${workLocation} - ${businessUnit}`,
  };
}

function milestoneMonths(won, allocations, calendar) {
  const interval = {
    monthly: 1,
    quarterly: 3,
    "half-yearly": 6,
    yearly: 12,
  }[won.milestoneFrequency];
  if (!interval) return [];

  const allocationRanges = allocations
    .map((allocation) => {
      const start = calendar.findIndex((month) => month.month === allocation.startMonth);
      if (start < 0) return null;
      const duration = Math.max(1, Math.ceil(Number(allocation.months) || 1));
      return { start, end: Math.min(calendar.length - 1, start + duration - 1) };
    })
    .filter(Boolean);
  const allocationStart = allocationRanges.length
    ? Math.min(...allocationRanges.map((range) => range.start))
    : -1;
  const allocationEnd = allocationRanges.length
    ? Math.max(...allocationRanges.map((range) => range.end))
    : -1;
  const storedStart = calendar.findIndex((month) => month.month === won.startMonth);
  const storedEnd = calendar.findIndex((month) => month.month === won.endMonth);
  const start = storedStart >= 0 ? storedStart : allocationStart;
  const end = storedEnd >= 0 ? storedEnd : allocationEnd;
  if (start < 0 || end < start) return [];

  const months = [];
  let next = interval === 1 ? start : Math.min(start + interval - 1, end);
  while (next <= end) {
    months.push(calendar[next].month);
    next += interval;
  }
  const endMonth = calendar[end].month;
  if (months[months.length - 1] !== endMonth) months.push(endMonth);
  return months;
}

export default function Calculation() {
  const { id } = useParams();
  const [factorSource, setFactorSource] = useState("ultimatix");
  const { wons, rateCard, setMilestoneFrequency } = useStore();
  const won = wons.find((item) => item.id === id);
  const selectedCurrency = won?.contractValueCurrency || "INR";
  const latestVersion = won?.versions[won.versions.length - 1];
  const calculationRates = rateCard;
  const currencyFactor = rateCard.currencyFactors.find(
    (factor) => factor.currency === selectedCurrency
  );
  const xFactor = currencyFactor?.[
    factorSource === "rt" ? "rtFactor" : "ultimatixFactor"
  ];
  const allocations = expandAllocations(latestVersion?.allocations || []);

  if (!won) {
    return (
      <Box>
        <PageHeader title="Work order not found" />
        <Button component={Link} to="/won" variant="outlined">
          Back to work orders
        </Button>
      </Box>
    );
  }

  const hasContractValue = won.contractValue !== "" && won.contractValue != null;
  const contractValue = Number(won.contractValue) || 0;
  const calculationRows = allocations.map((allocation) => {
    const totalCostCbInr = lineCost(allocation, calculationRates);
    const totalCostCbSelected = xFactor > 0 ? totalCostCbInr / xFactor : null;
    return { allocation, totalCostCbInr, totalCostCbSelected };
  });
  const totalCostCbSelectedSum = calculationRows.reduce(
    (total, row) => total + (row.totalCostCbSelected || 0),
    0
  );
  const minimumContractValue = totalCostCbSelectedSum * 2;
  const belowProfitabilityTarget =
    hasContractValue && xFactor > 0 && contractValue < minimumContractValue;
  const milestoneMonthList = milestoneMonths(won, allocations, rateCard.calendar);
  const milestoneDimensions = [
    ...new Map(
      allocations
        .filter((allocation) => allocation.workLocation || allocation.country || allocation.businessUnit)
        .map((allocation) => {
          const dimension = milestoneDimensionFor(allocation);
          return [dimension.key, dimension];
        })
    ).values(),
  ];
  const pvSelectedByAllocation = new Map(
    calculationRows.map((row) => [
      row.allocation.id,
      hasContractValue && row.totalCostCbSelected != null && totalCostCbSelectedSum > 0
        ? contractValue * (row.totalCostCbSelected / totalCostCbSelectedSum)
        : null,
    ])
  );
  const pvSelectedByDimension = new Map();
  calculationRows.forEach(({ allocation }) => {
    const pvSelected = pvSelectedByAllocation.get(allocation.id);
    if (pvSelected == null) return;
    const { key } = milestoneDimensionFor(allocation);
    pvSelectedByDimension.set(key, (pvSelectedByDimension.get(key) || 0) + pvSelected);
  });


  const summaryItems = [
    ["Contract ID", won.contractId || "-"],
    [
      "Contract value",
      won.contractValue !== "" && won.contractValue != null
        ? formatContractValue(won.contractValue, won.contractValueCurrency)
        : "-",
    ],
    ["Reference WON", won.referenceWonNumber || "-"],
    [
      "Period",
      won.startMonth && won.endMonth ? `${monthLabel(won.startMonth)} - ${monthLabel(won.endMonth)}` : "-",
    ],
  ];

  return (
    <Box>
      <PageHeader
        title={won.name || won.title}
        actions={
          <Button component={Link} to="/won" variant="outlined" color="inherit">
            Back to work orders
          </Button>
        }
      />

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
            }}
          >
            {summaryItems.map(([label, value]) => (
              <Box key={label}>
                <Typography variant="caption" color="text.secondary" component="div">
                  {label}
                </Typography>
                <Typography sx={{ fontWeight: 600 }}>{value}</Typography>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      <Typography variant="h2" sx={{ mb: 1.5 }}>
        Resource allocation
      </Typography>
      <Card sx={{ mb: 3 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Role</TableCell>
                <TableCell>Grade</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Work Location</TableCell>
                <TableCell>Business Unit</TableCell>
                <TableCell>Start month</TableCell>
                <TableCell>End month</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {allocations.map((allocation) => (
                <TableRow key={allocation.id} hover>
                  <TableCell>{allocation.role || "-"}</TableCell>
                  <TableCell>{gradeLabel(allocation, rateCard.roles)}</TableCell>
                  <TableCell>{allocation.country || "-"}</TableCell>
                  <TableCell>{allocation.workLocation || "-"}</TableCell>
                  <TableCell>{allocation.businessUnit || "-"}</TableCell>
                  <TableCell>{allocation.startMonth ? monthLabel(allocation.startMonth) : "-"}</TableCell>
                  <TableCell>
                    {allocationEndMonth(allocation, calculationRates.calendar)
                      ? monthLabel(allocationEndMonth(allocation, calculationRates.calendar))
                      : "-"}
                  </TableCell>
                </TableRow>
              ))}
              {allocations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ color: "text.secondary", py: 4 }}>
                    No resource allocations.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} sx={{ mb: 1.5 }}>
        <Typography variant="h2">Calculation</Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          color="primary"
          value={factorSource}
          onChange={(_, value) => value && setFactorSource(value)}
          aria-label="Currency factor source"
        >
          <ToggleButton value="ultimatix">Ultimatix</ToggleButton>
          <ToggleButton value="rt">RT</ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      {belowProfitabilityTarget && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Contract value is below the minimum needed for 50% profitability ({formatContractValue(minimumContractValue, selectedCurrency)}).
        </Alert>
      )}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Grade</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Work Location</TableCell>
                <TableCell>Business Unit</TableCell>
                <TableCell align="right">Cost per day in INR</TableCell>
                <TableCell>Currency</TableCell>
                <TableCell align="right">X factor</TableCell>
                <TableCell align="right">Total Cost (CB) in INR</TableCell>
                <TableCell align="right">{`Total Cost (CB) in ${selectedCurrency}`}</TableCell>
                <TableCell align="right">PV in INR</TableCell>
                <TableCell align="right">{`PV in ${selectedCurrency}`}</TableCell>
                <TableCell align="right">Profitability</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {calculationRows.map((row) => {
                const { allocation, totalCostCbInr, totalCostCbSelected } = row;
                const pvSelected = pvSelectedByAllocation.get(allocation.id);
                const profitability =
                  pvSelected > 0 && totalCostCbSelected != null
                    ? ((pvSelected - totalCostCbSelected) / pvSelected) * 100
                    : null;
                return (
                  <TableRow key={allocation.id} hover>
                    <TableCell>{gradeLabel(allocation, rateCard.roles)}</TableCell>
                    <TableCell>{allocation.country || "-"}</TableCell>
                    <TableCell>{allocation.workLocation || "-"}</TableCell>
                    <TableCell>{allocation.businessUnit || "-"}</TableCell>
                    <TableCell align="right">{dailyRateInr(allocation, calculationRates)}</TableCell>
                    <TableCell>{selectedCurrency}</TableCell>
                    <TableCell align="right">{xFactor ?? "-"}</TableCell>
                    <TableCell align="right">{inr(totalCostCbInr)}</TableCell>
                    <TableCell align="right">
                      {totalCostCbSelected == null
                        ? "-"
                        : formatContractValue(totalCostCbSelected, selectedCurrency)}
                    </TableCell>
                    <TableCell align="right">
                      {pvSelected == null ? "-" : inr(pvSelected * xFactor)}
                    </TableCell>
                    <TableCell align="right">
                      {pvSelected == null ? "-" : formatContractValue(pvSelected, selectedCurrency)}
                    </TableCell>
                    <TableCell align="right">
                      {profitability == null ? "-" : `${profitability.toFixed(1)}%`}
                    </TableCell>
                  </TableRow>
                );
              })}
              {allocations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} align="center" sx={{ color: "text.secondary", py: 4 }}>
                    No resource allocations.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Box component="section" sx={{ mt: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} sx={{ mb: 1.5 }}>
          <Typography variant="h2">Milestone split</Typography>
          <TextField
            select
            label="Frequency"
            sx={{ minWidth: 200 }}
            value={won.milestoneFrequency || ""}
            onChange={(event) => setMilestoneFrequency(won.id, event.target.value)}
            slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
          >
            <MenuItem value="">
              <em>Select frequency</em>
            </MenuItem>
            <MenuItem value="monthly">Monthly</MenuItem>
            <MenuItem value="quarterly">Quarterly</MenuItem>
            <MenuItem value="half-yearly">Half-yearly</MenuItem>
            <MenuItem value="yearly">Yearly</MenuItem>
          </TextField>
        </Stack>
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell aria-hidden="true" />
                  {milestoneDimensions.map(({ key, label }) => (
                    <TableCell key={key}>{label}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {milestoneMonthList.map((month) => (
                  <TableRow key={month} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{monthLabel(month)}</TableCell>
                    {milestoneDimensions.map(({ key }) => {
                      const totalPv = pvSelectedByDimension.get(key);
                      const milestonePv =
                        totalPv != null && milestoneMonthList.length > 0
                          ? totalPv / milestoneMonthList.length
                          : null;
                      return (
                        <TableCell key={key}>
                          {milestonePv == null
                            ? "-"
                            : formatContractValue(milestonePv, selectedCurrency)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Box>
    </Box>
  );
}
