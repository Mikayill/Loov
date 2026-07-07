/**
 * Bundle-aware cart pricing — one pure function used by the cart page, the
 * checkout page, AND the order API, so the discount can never drift between
 * what the customer sees and what the server actually charges.
 *
 * Rule: a group of cart lines tagged with the same `bundleSlug` only gets the
 * bundle's flat price when it EXACTLY matches that bundle's official item
 * list (same products, same per-product quantity). Any mismatch — a removed
 * item, a changed quantity, an unknown/inactive bundle — falls back to
 * pricing every line individually. No partial-bundle proration.
 */

export interface BundleGroupLine {
  /** Unique per-line identifier (cart item key, or an order_items index). */
  key: string;
  /** Product SLUG (bundle.items references products by slug, not id). */
  productSlug: string;
  /** Server- or catalog-verified unit price — never trust a client-sent price. */
  unitPrice: number;
  quantity: number;
  bundleSlug?: string | null;
}

export interface BundleDef {
  slug: string;
  items: { slug: string; quantity?: number }[];
  bundlePrice: number;
}

export interface BundleGroupResult {
  subtotal: number;
  /** Per-line allocated price (unitPrice*qty, or a proportional bundle-price share when matched). */
  lineTotals: Map<string, number>;
  /** bundleSlugs whose group actually got the flat bundle price applied. */
  matchedBundles: Set<string>;
}

function bundleMatches(groupLines: BundleGroupLine[], bundle: BundleDef): boolean {
  const groupQty = new Map<string, number>();
  for (const line of groupLines) {
    groupQty.set(line.productSlug, (groupQty.get(line.productSlug) ?? 0) + line.quantity);
  }
  const bundleQty = new Map<string, number>();
  for (const item of bundle.items) {
    bundleQty.set(item.slug, (bundleQty.get(item.slug) ?? 0) + (item.quantity ?? 1));
  }
  if (groupQty.size !== bundleQty.size) return false;
  for (const [slug, qty] of bundleQty) {
    if (groupQty.get(slug) !== qty) return false;
  }
  return true;
}

export function priceCartWithBundles(lines: BundleGroupLine[], bundleDefs: BundleDef[]): BundleGroupResult {
  const bundleBySlug = new Map(bundleDefs.map((b) => [b.slug, b]));
  const groups = new Map<string, BundleGroupLine[]>();
  const ungrouped: BundleGroupLine[] = [];

  for (const line of lines) {
    if (line.bundleSlug) {
      const arr = groups.get(line.bundleSlug) ?? [];
      arr.push(line);
      groups.set(line.bundleSlug, arr);
    } else {
      ungrouped.push(line);
    }
  }

  let subtotal = 0;
  const lineTotals = new Map<string, number>();
  const matchedBundles = new Set<string>();

  for (const line of ungrouped) {
    const total = line.unitPrice * line.quantity;
    lineTotals.set(line.key, total);
    subtotal += total;
  }

  for (const [slug, groupLines] of groups) {
    const bundle = bundleBySlug.get(slug);
    const individualSum = groupLines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);

    if (bundle && bundleMatches(groupLines, bundle)) {
      matchedBundles.add(slug);
      // Proportional allocation; the last line absorbs the rounding remainder
      // so the shares sum EXACTLY to bundlePrice.
      let allocated = 0;
      groupLines.forEach((line, i) => {
        const isLast = i === groupLines.length - 1;
        let share: number;
        if (isLast) {
          share = bundle.bundlePrice - allocated;
        } else {
          const lineIndividual = line.unitPrice * line.quantity;
          share = individualSum > 0 ? Math.round((bundle.bundlePrice * lineIndividual) / individualSum) : 0;
        }
        allocated += share;
        lineTotals.set(line.key, share);
      });
      subtotal += bundle.bundlePrice;
    } else {
      for (const line of groupLines) {
        const total = line.unitPrice * line.quantity;
        lineTotals.set(line.key, total);
        subtotal += total;
      }
    }
  }

  return { subtotal, lineTotals, matchedBundles };
}
