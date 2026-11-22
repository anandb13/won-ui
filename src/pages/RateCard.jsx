import {
  Box,
  Button,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useStore } from "../lib/store.jsx";
import RateCsvUpload from "../components/RateCsvUpload.jsx";
import PageHeader from "../ui/PageHeader.jsx";

const cellInput = { width: 110, "& input": { textAlign: "right" } };

function Section({ title, children }) {
  return (
    <>
      <Typography variant="h2" sx={{ mt: 3, mb: 1.5 }}>
        {title}
      </Typography>
      <Card>
        <TableContainer>{children}</TableContainer>
      </Card>
    </>
  );
}

export default function RateCard() {
  const { rateCard, setRate, setNetWorkDays, applyRates, resetReferenceData } = useStore();

  return (
    <Box>
      <PageHeader
        title="Rate card & inputs"
        subtitle="Reference values from Rate_Card_and_Work_Days.xlsx. WON costs use daily INR rate × net work days × number of resources. Changes here update calculations for new and existing work orders."
        actions={
          <Button variant="outlined" color="inherit" onClick={resetReferenceData}>
            Reset
          </Button>
        }
      />

      <RateCsvUpload rateCard={rateCard} onApply={applyRates} />

      <Section title="Daily cost by category and country (INR)">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Category</TableCell>
              <TableCell>Reference label</TableCell>
              {rateCard.countries.map((country) => (
                <TableCell align="right" key={country}>
                  {country}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rateCard.roles.map((role) => (
              <TableRow key={role.id} hover>
                <TableCell>
                  <strong>{role.id}</strong>
                </TableCell>
                <TableCell>{role.title}</TableCell>
                {rateCard.countries.map((country) => (
                  <TableCell align="right" key={country}>
                    <TextField
                      type="number"
                      sx={cellInput}
                      slotProps={{
                        htmlInput: {
                          min: 0,
                          step: 1,
                          "aria-label": `${role.id} daily cost in ${country}`,
                        },
                      }}
                      value={rateCard.dailyRates[role.id][country]}
                      onChange={(e) => setRate(role.id, country, e.target.value)}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      <Section title="Net workdays by month and country">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Month</TableCell>
              <TableCell align="right">Workdays</TableCell>
              {rateCard.countries.map((country) => (
                <TableCell align="right" key={country}>
                  {country}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rateCard.calendar.map((month) => (
              <TableRow key={month.month} hover>
                <TableCell>
                  {new Date(`${month.month}-01T00:00:00`).toLocaleDateString("en-IN", {
                    month: "short",
                    year: "numeric",
                  })}
                </TableCell>
                <TableCell align="right">{month.workDays}</TableCell>
                {rateCard.countries.map((country) => {
                  const netWorkDays = month.workDays - (month.leaves[country] || 0);
                  return (
                    <TableCell align="right" key={country}>
                      <TextField
                        type="number"
                        sx={cellInput}
                        slotProps={{
                          htmlInput: {
                            min: 0,
                            max: month.workDays,
                            step: 1,
                            "aria-label": `${month.month} net workdays in ${country}`,
                          },
                        }}
                        value={netWorkDays}
                        onChange={(e) => setNetWorkDays(month.month, country, e.target.value)}
                      />
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      <Section title="Currency factors">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Currency</TableCell>
              <TableCell align="right">$ Ultimatix factor</TableCell>
              <TableCell align="right">RT factor</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rateCard.currencyFactors.map((factor) => (
              <TableRow key={factor.currency} hover>
                <TableCell>{factor.currency}</TableCell>
                <TableCell align="right">{factor.ultimatixFactor}</TableCell>
                <TableCell align="right">{factor.rtFactor}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>
    </Box>
  );
}
