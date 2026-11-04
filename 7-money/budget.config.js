// The spend guard: RACKD stops scraping for the rest of the month once this is reached.
// Also set Apify's own monthly usage limit in the Apify console as a second, hard cap.
export const BUDGET = {
  monthlyUsd: Number(process.env.MONTHLY_BUDGET_USD || 330),
  alertAt: [50, 80],        // email alerts at these percentages of the budget (and at 100%)
};
