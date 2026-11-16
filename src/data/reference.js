const countries = ["US", "UK", "Canada", "India", "Mexico", "Brazil", "Uruguay"];

export const INDIA_WORK_LOCATIONS = [
  "Ahmedabad",
  "Bangalore",
  "Bhubaneswar",
  "Chennai",
  "Gurgaon",
  "Hyderabad",
  "Indore",
  "Kochi",
  "Kolkata",
  "Mumbai",
  "New Delhi",
  "Noida",
  "Pune",
  "Trivandrum",
];

export const BUSINESS_UNITS = [
  "ADM",
  "AI",
  "BPS",
  "CBO",
  "CIU",
  "Cloud",
  "CSP",
  "D&A",
  "ESU",
  "IOTDE",
  "TI",
];

const rateRows = [
  ["TRAINEE", "Trainee (Y)", 14281, 11467, 14602, 1607, 6272, 4568, 7286],
  ["ASE", "ASE (C1,C1Y)", 16562, 16634, 15237, 2680, 8415, 11322, 10893],
  ["ITA", "ITA (C2)", 19949, 19037, 18665, 4777, 13381, 22481, 15951],
  ["AST", "AST (C3A)", 24029, 22536, 20666, 7315, 18637, 30494, 21201],
  ["ASC", "ASC (C3B)", 25329, 25126, 23416, 9704, 23220, 36581, 27802],
  ["CONS", "CONS (C4)", 31010, 35987, 28545, 14651, 32975, 64793, 35297],
  ["BPO3", "BPO3", 13811, 15715, 14367, 3251, 8145, 20671, 11267],
  ["BPO4", "BPO4", 16808, 19873, 19443, 4591, 11069, 20553, 15803],
  ["BPO5", "BPO5", 21386, 24011, 21275, 6962, 16473, 24302, 25636],
  ["BPO6", "BPO6", 23029, 27454, 22596, 10050, 20718, 36581, 27802],
];

const calendarCountries = ["India", "Canada", "Brazil", "Mexico", "Uruguay", "US", "UK"];
const calendarRows = [
  ["2026-07", 23, 1, 1, 0, 0, 1, 1, 0],
  ["2026-08", 21, 1, 1, 0, 0, 1, 0, 0],
  ["2026-09", 22, 1, 1, 1, 1, 0, 1, 0],
  ["2026-10", 22, 1, 1, 1, 0, 0, 0, 0],
  ["2026-11", 21, 1, 0, 3, 1, 0, 1, 0],
  ["2026-12", 23, 1, 2, 1, 1, 1, 2, 0],
  ["2027-01", 21, 1, 1, 1, 1, 1, 2, 1],
  ["2027-02", 20, 0, 1, 1, 1, 0, 0, 0],
  ["2027-03", 23, 1, 0, 0, 1, 0, 0, 0],
  ["2027-04", 22, 2, 1, 2, 2, 1, 0, 2],
  ["2027-05", 21, 1, 1, 1, 1, 1, 1, 2],
  ["2027-06", 22, 0, 0, 1, 0, 0, 0, 1],
  ["2027-07", 22, 0, 1, 0, 0, 1, 1, 1],
  ["2027-08", 22, 1, 1, 0, 0, 1, 0, 1],
  ["2027-09", 22, 1, 1, 1, 1, 0, 1, 0],
  ["2027-10", 21, 1, 1, 1, 0, 0, 0, 0],
  ["2027-11", 22, 1, 0, 3, 1, 0, 1, 0],
  ["2027-12", 23, 1, 22, 21, 21, 21, 22, 2],
];

export const REFERENCE_DATA = {
  countries,
  roles: rateRows.map(([id, title]) => ({ id, title })),
  dailyRates: Object.fromEntries(
    rateRows.map(([id, , ...values]) => [
      id,
      Object.fromEntries(countries.map((country, index) => [country, values[index]])),
    ])
  ),
  currencyFactors: [
    { currency: "USD", xFactor: 72.625, ultimatixFactor: 42.88, rtFactor: 72.625 },
    { currency: "AUD", xFactor: 0, ultimatixFactor: 41.23, rtFactor: 52.413 },
    { currency: "GBP", xFactor: 91.96, ultimatixFactor: 85.18, rtFactor: 91.96 },
    { currency: "CAD", xFactor: 55.801, ultimatixFactor: 42.66, rtFactor: 55.801 },
    { currency: "INR", xFactor: 0, ultimatixFactor: 1, rtFactor: 1 },
  ],
  calendar: calendarRows.map(([month, workDays, ...leaveValues]) => ({
    month,
    workDays,
    leaves: Object.fromEntries(
      calendarCountries.map((country, index) => [country, leaveValues[index] || 0])
    ),
  })),
};

export function monthLabel(month) {
  return new Date(`${month}-01T00:00:00`).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });
}