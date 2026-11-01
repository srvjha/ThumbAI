/**
 * Creates the paid credit packs as one-time Dodo Payments products and prints
 * the env vars to set. Run once per mode (test and live keys have separate
 * catalogues):
 *
 *   node --env-file=.env tools/dodo-create-products.mjs
 *
 * Prices mirror src/config/plans.ts. If you change a price there, edit the
 * product in the Dodo dashboard too: checkout charges the Dodo product's
 * price, while the order records the catalogue price.
 */
import DodoPayments from 'dodopayments';

const PACKS = [
  {
    env: 'DODO_PRODUCT_CREATOR_PRO',
    name: 'ThumbAI Creator Pro: 8 credits',
    priceCents: 299,
  },
  {
    env: 'DODO_PRODUCT_BUSINESS_ELITE',
    name: 'ThumbAI Business Elite: 20 credits',
    priceCents: 499,
  },
];

const apiKey = process.env.DODO_PAYMENTS_API_KEY;
if (!apiKey) {
  console.error('Set DODO_PAYMENTS_API_KEY first.');
  process.exit(1);
}
const environment = process.env.DODO_PAYMENTS_ENVIRONMENT ?? 'test_mode';
const client = new DodoPayments({ bearerToken: apiKey, environment });

console.log(`Creating products in ${environment}…\n`);
for (const pack of PACKS) {
  const product = await client.products.create({
    name: pack.name,
    description: 'One-time pack of AI thumbnail credits. Credits never expire.',
    tax_category: 'saas',
    price: {
      type: 'one_time_price',
      currency: 'USD',
      price: pack.priceCents,
      discount: 0,
      purchasing_power_parity: false,
    },
  });
  console.log(`${pack.env}="${product.product_id}"`);
}
