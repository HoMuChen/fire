import { createClient } from '@supabase/supabase-js';

const FINMIND_BASE_URL = 'https://api.finmindtrade.com/api/v4/data';

interface FinMindStockInfo {
  industry_category: string;
  stock_id: string;
  stock_name: string;
  type: string;
  date: string;
}

async function seed() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const finmindToken = process.env.FINMIND_API_TOKEN;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    console.error('Make sure .env.local is configured.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  console.log('Fetching stock list from FinMind...');

  const url = new URL(FINMIND_BASE_URL);
  url.searchParams.set('dataset', 'TaiwanStockInfo');
  if (finmindToken) url.searchParams.set('token', finmindToken);

  const response = await fetch(url.toString());
  const json = await response.json();

  if (json.status !== 200) {
    console.error('FinMind API error:', json.msg);
    process.exit(1);
  }

  const stocks: FinMindStockInfo[] = json.data;
  console.log(`Fetched ${stocks.length} stocks`);

  // Upsert in batches of 500
  const batchSize = 500;
  for (let i = 0; i < stocks.length; i += batchSize) {
    const batch = stocks.slice(i, i + batchSize).map((s) => ({
      stock_id: s.stock_id,
      stock_name: s.stock_name,
      industry_category: s.industry_category,
      type: s.type,
      sync_status: 'pending',
    }));

    const { error } = await supabase
      .from('stocks')
      .upsert(batch, { onConflict: 'stock_id' });

    if (error) {
      console.error(`Error upserting batch ${Math.floor(i / batchSize) + 1}:`, error.message);
    } else {
      console.log(`[${Math.min(i + batchSize, stocks.length)}/${stocks.length}] stocks upserted`);
    }
  }

  console.log('Seed complete!');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
