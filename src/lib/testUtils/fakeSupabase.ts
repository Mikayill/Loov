/**
 * TEST-ONLY minimal in-memory fake for the Supabase admin client's fluent
 * query builder. Not a general-purpose mock — it supports exactly the chain
 * shapes used by src/lib/promoValidation.ts and src/lib/loyaltyReversal.ts
 * (select/eq/neq/maybeSingle, insert, update/eq/eq, delete/eq/eq[/eq]),
 * backed by real in-memory arrays so assertions can check actual row state
 * instead of mocked call arguments.
 */

type Row = Record<string, unknown>;
type Tables = Record<string, Row[]>;

function matches(row: Row, filters: [string, unknown, "eq" | "neq"][]): boolean {
  return filters.every(([k, v, op]) => (op === "eq" ? row[k] === v : row[k] !== v));
}

class FakeQuery {
  private filters: [string, unknown, "eq" | "neq"][] = [];
  private countMode = false;
  constructor(private tables: Tables, private table: string) {}

  select(_cols: string, opts?: { count?: "exact"; head?: boolean }) {
    if (opts?.count) this.countMode = true;
    return this;
  }
  eq(k: string, v: unknown) {
    this.filters.push([k, v, "eq"]);
    return this;
  }
  neq(k: string, v: unknown) {
    this.filters.push([k, v, "neq"]);
    return this;
  }
  private rows() {
    return (this.tables[this.table] ?? []).filter((r) => matches(r, this.filters));
  }
  async maybeSingle() {
    const rows = this.rows();
    return { data: rows[0] ?? null, error: null };
  }
  // Awaiting the query directly (no .maybeSingle()) — used for count queries.
  then(resolve: (v: { data: Row[] | null; count: number | null; error: null }) => void) {
    const rows = this.rows();
    resolve({ data: this.countMode ? null : rows, count: this.countMode ? rows.length : null, error: null });
  }
  async insert(rows: Row | Row[]) {
    const arr = Array.isArray(rows) ? rows : [rows];
    this.tables[this.table] = [...(this.tables[this.table] ?? []), ...arr];
    return { error: null };
  }
  update(patch: Row) {
    const self = this;
    return {
      eq(k: string, v: unknown) {
        self.filters.push([k, v, "eq"]);
        return this;
      },
      then(resolve: (v: { error: null }) => void) {
        const table = self.tables[self.table] ?? [];
        self.tables[self.table] = table.map((r) => (matches(r, self.filters) ? { ...r, ...patch } : r));
        resolve({ error: null });
      },
    };
  }
  delete() {
    const self = this;
    return {
      eq(k: string, v: unknown) {
        self.filters.push([k, v, "eq"]);
        return this;
      },
      then(resolve: (v: { error: null }) => void) {
        const table = self.tables[self.table] ?? [];
        self.tables[self.table] = table.filter((r) => !matches(r, self.filters));
        resolve({ error: null });
      },
    };
  }
}

export function createFakeAdmin(initial: Tables) {
  const tables: Tables = JSON.parse(JSON.stringify(initial));
  return {
    tables, // exposed so tests can assert final state directly
    from: (table: string) => new FakeQuery(tables, table),
  };
}
