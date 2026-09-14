// One-time script: creates the Stripe Product + Price for the single Chat IR subscription
// plan, if they don't already exist. Idempotent - safe to re-run.
// Run with: npx tsx scripts/stripe-setup.ts

import { config } from 'dotenv';
import { resolve } from 'path';
import Stripe from 'stripe';

config({ path: resolve(process.cwd(), '.env.local') });

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  console.error('❌ STRIPE_SECRET_KEY is not set in .env.local');
  process.exit(1);
}

const stripe = new Stripe(secretKey, { typescript: true });

const PRODUCT_NAME = 'Chat IR Subscription';
const PRICE_AMOUNT_CENTS = 9900; // $99.00
const PRICE_CURRENCY = 'usd';

async function main() {
  const existingProducts = await stripe.products.list({ active: true, limit: 100 });
  let product = existingProducts.data.find((p) => p.name === PRODUCT_NAME);

  if (product) {
    console.log(`✅ Found existing product: ${product.id}`);
  } else {
    product = await stripe.products.create({
      name: PRODUCT_NAME,
      description: 'Chat IR — all-inclusive monthly subscription (voice + chat agents, unlimited usage).',
    });
    console.log(`✅ Created product: ${product.id}`);
  }

  const existingPrices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
  let price = existingPrices.data.find(
    (p) =>
      p.recurring?.interval === 'month' &&
      p.unit_amount === PRICE_AMOUNT_CENTS &&
      p.currency === PRICE_CURRENCY
  );

  if (price) {
    console.log(`✅ Found existing price: ${price.id}`);
  } else {
    price = await stripe.prices.create({
      product: product.id,
      unit_amount: PRICE_AMOUNT_CENTS,
      currency: PRICE_CURRENCY,
      recurring: { interval: 'month' },
    });
    console.log(`✅ Created price: ${price.id}`);
  }

  console.log('\n--- Add this to .env.local ---');
  console.log(`STRIPE_PRICE_ID=${price.id}`);
}

main().catch((err) => {
  console.error('❌ Setup failed:', err.message || err);
  process.exit(1);
});
