import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Box, Button, Card, CardContent, LinearProgress, Stack, Typography } from "@mui/material";
import { useStore } from "../lib/store.jsx";
import { STATUSES, inr, summarize } from "../lib/cost.js";
import PageHeader from "../ui/PageHeader.jsx";

function Bars({ items, format }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <Stack spacing={1.5}>
      {items.map((i) => (
        <Box
          key={i.label}
          sx={{ display: "grid", gridTemplateColumns: "88px 1fr auto", alignItems: "center", gap: 1.5 }}
        >
          <Typography variant="body2">{i.label}</Typography>
          <LinearProgress
            variant="determinate"
            value={(i.value / max) * 100}
            aria-label={`${i.label}: ${format(i.value)}`}
            sx={{ height: 10, borderRadius: 5 }}
          />
          <Typography variant="body2" align="right" sx={{ minWidth: 70 }}>
            {format(i.value)}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}

function Stat({ label, value }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 600, mt: 0.5 }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { wons, rateCard } = useStore();

  const stats = useMemo(() => {
    const latest = wons.map((w) => w.versions[w.versions.length - 1]);
    const total = latest.reduce((t, v) => t + v.total, 0);
    const approved = wons
      .filter((w) => w.status === "Approved")
      .reduce((t, w) => t + w.versions[w.versions.length - 1].total, 0);

    const byStatus = STATUSES.map((s) => ({
      label: s,
      value: wons.filter((w) => w.status === s).length,
    }));

    // Cost per category, using the current reference values.
    const categoryTotals = {};
    for (const v of latest) {
      const s = summarize(v.allocations, rateCard, v.contingencyPct);
      for (const [category, cost] of Object.entries(s.byCategory))
        categoryTotals[category] = (categoryTotals[category] || 0) + cost;
    }
    const byCategory = rateCard.roles.map((role) => ({
      label: role.id,
      value: categoryTotals[role.id] || 0,
    }));

    return { count: wons.length, total, approved, avg: wons.length ? total / wons.length : 0, byStatus, byCategory };
  }, [wons, rateCard]);

  return (
    <Box>
      <PageHeader
        title="Dashboard"
        actions={
          <Button component={Link} to="/won/new" variant="contained">
            New WON
          </Button>
        }
      />

      <Box
        sx={{
          display: "grid",
          gap: 2,
          mb: 2.5,
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
        }}
      >
        <Stat label="Work orders" value={stats.count} />
        <Stat label="Total value" value={inr(stats.total)} />
        <Stat label="Approved value" value={inr(stats.approved)} />
        <Stat label="Average per WON" value={inr(stats.avg)} />
      </Box>

      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" } }}>
        <Card>
          <CardContent>
            <Typography variant="h2" sx={{ mb: 2 }}>
              Work orders by status
            </Typography>
            <Bars items={stats.byStatus} format={(n) => n} />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h2" sx={{ mb: 2 }}>
              Cost by category
            </Typography>
            <Bars items={stats.byCategory} format={inr} />
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
