# Easy Expense Tracker (Supabase, bring your own account)

A minimal, mobile-first expense tracker. React + TypeScript + Vite, hosted on GitHub Pages, data in **your own** Supabase project.

- **Expenses**: Today / Last 7 days / Last 30 days totals, breakdown by type, feeling or card, and a day-by-day list.
  Each expense has amount + currency, card, cashback %, type, feeling, date and note.
- **Bills**: EMIs, card payments, loans, rent, utilities, Remitly and so on. Pick a bill from the dropdown and mark it paid. The amount pre-fills from the last payment.
  Shows This week / This month / Last 30 days totals and a per-bill breakdown. Bill totals are kept separate from expenses.
- **Menu (☰)**: manage cards (with default cashback %), expense types, feelings and bills; a monthly summary of expenses and bills; your Supabase connection details; sign out.

Totals are shown per currency (no exchange-rate conversion). USD is the default.

## 1. Set up Supabase (once)

1. Create a free project at [supabase.com](https://supabase.com).
2. **SQL Editor → New query**: paste the contents of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**.
   This creates the tables and Row Level Security policies (each user can only see their own rows).
3. **Authentication → URL Configuration**: set **Site URL** to your app URL, e.g.
   `https://<your-github-username>.github.io/easy-expense-tracker-supabase-byoa/`
   (This only matters for email-confirmation links.)
4. **Project Settings → API**: copy the **Project URL** and the **publishable / anon** key.
   ⚠️ Never use the `service_role` / secret key in the app.

## 2. First launch

1. Open the app and paste the Project URL and key. They are stored only in that browser's localStorage.
2. Choose **Create an account** (email + password). Confirm the email if Supabase asks you to.
3. After you sign in for the first time, the app adds starter lists (types, feelings, a few bills, and "Cash"). Edit them in Settings.

### Lock it down (recommended)

Once your account exists, go to **Authentication → Sign In / Providers** and turn off **Allow new users to sign up**.
The publishable key is safe to expose. With sign-ups off and RLS on, nobody else can create an account or read your data.

On each new device or browser, enter the URL and key once, then sign in.

## 3. Deploy to GitHub Pages

```sh
git init && git add -A && git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<you>/easy-expense-tracker-supabase-byoa.git
git push -u origin main
```

In the repo, go to **Settings → Pages → Source** and choose **GitHub Actions**. Every push to `main` builds and deploys
(`.github/workflows/deploy.yml`). The build uses relative paths, so any repo name works.

On your phone, open the site and choose **Add to Home Screen** to use it like an app.

## Local development

```sh
npm install
npm run dev
```

## Changing the look

All colors, fonts, spacing and radii are CSS variables in [`src/theme.css`](src/theme.css), with light and dark variants.
Edit that file to restyle the app. `src/styles.css` only references those tokens.

Other knobs:
- Week start day: `WEEK_STARTS_ON` in `src/lib/dates.ts`
- Currency list and default: `src/lib/money.ts`
- Default cashback for new expenses: `DEFAULT_CASHBACK` in `src/pages/ExpenseForm.tsx`
- Bill types: `PAYEE_KINDS` in `src/lib/types.ts`
