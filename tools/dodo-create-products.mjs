/**
 * Creates the paid credit packs as one-time Dodo Payments products under a
 * "ThumbAI" brand, and prints the env vars to set. Run once per mode (test
 * and live have separate catalogues):
 *
 *   node --env-file=.env.live tools/dodo-create-products.mjs
 *
 * where the env file holds DODO_PAYMENTS_API_KEY and
 * DODO_PAYMENTS_ENVIRONMENT (test_mode or live_mode).
 *
 * Safe to re-run: an existing ThumbAI brand is reused, and a pack whose
 * product already exists under that name is printed instead of recreated.
 *
 * Prices mirror src/config/plans.ts. If you change a price there, edit the
 * product in the Dodo dashboard too: checkout charges the Dodo product's
 * price, while the order records the catalogue price.
 */
import DodoPayments from 'dodopayments';

const BRAND = {
  name: 'ThumbAI',
  url: 'https://thumbai.srvjha.in',
  support_email: 'jhasaurav0209001@gmail.com',
  description: 'AI YouTube thumbnail, Shorts cover and blog cover generator.',
  statement_descriptor: 'THUMBAI',
};

const PACKS = [
  {
    env: 'DODO_PRODUCT_CREATOR_PRO',
    name: 'ThumbAI Creator Pro: 25 credits',
    description:
      'One-time pack of 25 AI thumbnail credits. Credits never expire.',
    priceCents: 799,
  },
  {
    env: 'DODO_PRODUCT_BUSINESS_ELITE',
    name: 'ThumbAI Business Elite: 60 credits',
    description:
      'One-time pack of 60 AI thumbnail credits. Credits never expire.',
    priceCents: 1499,
  },
];

const apiKey = process.env.DODO_PAYMENTS_API_KEY;
if (!apiKey) {
  console.error('Set DODO_PAYMENTS_API_KEY first.');
  process.exit(1);
}
const environment = process.env.DODO_PAYMENTS_ENVIRONMENT ?? 'test_mode';
if (environment !== 'test_mode' && environment !== 'live_mode') {
  console.error('DODO_PAYMENTS_ENVIRONMENT must be test_mode or live_mode.');
  process.exit(1);
}
const client = new DodoPayments({ bearerToken: apiKey, environment });

console.log(`Dodo ${environment}\n`);

// Brand: reuse one named ThumbAI, else create it.
const { items: brands } = await client.brands.list();
let brand = brands.find(
  (b) => b.name?.trim().toLowerCase() === BRAND.name.toLowerCase(),
);
if (brand) {
  console.log(`Using brand ${brand.name} (${brand.brand_id})`);
} else {
  brand = await client.brands.create(BRAND);
  console.log(`Created brand ${brand.name} (${brand.brand_id})`);
  console.log('  Upload its logo in the Dodo dashboard: Settings → Brands.');
}
if (brand.verification_status && brand.verification_status !== 'Success') {
  console.log(`  Brand verification: ${brand.verification_status}`);
}

// Products already in this mode, by name, so a re-run doesn't duplicate.
const existing = new Map();
for await (const product of client.products.list({ archived: false })) {
  if (product.name) existing.set(product.name, product);
}

console.log('');
const lines = [];
for (const pack of PACKS) {
  const found = existing.get(pack.name);
  if (found) {
    console.log(`Exists:  ${pack.name} (${found.product_id})`);
    lines.push(`${pack.env}="${found.product_id}"`);
    continue;
  }
  const product = await client.products.create({
    name: pack.name,
    description: pack.description,
    brand_id: brand.brand_id,
    tax_category: 'saas',
    price: {
      type: 'one_time_price',
      currency: 'USD',
      price: pack.priceCents,
      discount: 0,
      purchasing_power_parity: false,
    },
  });
  console.log(`Created: ${pack.name} (${product.product_id})`);
  lines.push(`${pack.env}="${product.product_id}"`);
}

console.log(`\nSet these (${environment}):\n`);
console.log(lines.join('\n'));
