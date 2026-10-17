import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY;

// ── Exported flag so routes can warn users when they are in local mode ─────────
export const isLocalMode = !(supabaseUrl && supabaseKey);

// ── Real Supabase client ───────────────────────────────────────────────────────
if (!isLocalMode) {
  console.log("✅ Supabase client initialised (remote database).");
} else {
  console.warn(
    "\n⚠️  SUPABASE NOT CONFIGURED — running in LOCAL FILE STORE mode.\n" +
    "   Data is saved to ./data/<table>.json on this machine only.\n" +
    "   This store is NOT shared between team members and will be LOST if the\n" +
    "   server directory is deleted. Set SUPABASE_URL, SUPABASE_SECRET_KEY and\n" +
    "   SUPABASE_PUBLISHABLE_KEY in Backend/.env to use the real database.\n"
  );
}

// ── Minimal local fallback (used only when Supabase is not configured) ─────────
class LocalTableQuery {
  constructor(tableName, store) {
    this.tableName = tableName;
    this.store = store;
    this.filters = [];
    this.orderBy = null;
    this.isSingle = false;
    this.action = "select";
    this.updateData = null;
    this.insertData = null;
  }

  select(_fields = "*") { this.action = "select"; return this; }
  insert(data)          { this.action = "insert"; this.insertData = data; return this; }
  update(data)          { this.action = "update"; this.updateData = data; return this; }
  delete()              { this.action = "delete"; return this; }
  eq(column, value)     { this.filters.push({ column, value }); return this; }
  order(column, { ascending = true } = {}) { this.orderBy = { column, ascending }; return this; }

  single() {
    this.isSingle = true;
    return this.execute();
  }

  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }

  async execute() {
    const list = this.store.read(this.tableName);

    if (this.action === "insert") {
      const records = Array.isArray(this.insertData) ? this.insertData : [this.insertData];
      const created = records.map((r) => ({
        id: r.id || crypto.randomUUID(),
        created_at: r.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...r
      }));
      list.push(...created);
      this.store.write(this.tableName, list);
      const result = this.isSingle ? created[0] : created;
      return { data: result, error: null };
    }

    if (this.action === "update") {
      let lastUpdated = null;
      for (const item of list) {
        const matches = this.filters.every((f) => item[f.column] === f.value);
        if (matches) {
          Object.assign(item, this.updateData, { updated_at: new Date().toISOString() });
          lastUpdated = item;
        }
      }
      this.store.write(this.tableName, list);
      return { data: lastUpdated, error: null };
    }

    if (this.action === "delete") {
      const remaining = list.filter(
        (item) => !this.filters.every((f) => item[f.column] === f.value)
      );
      this.store.write(this.tableName, remaining);
      return { data: null, error: null };
    }

    // select
    let filtered = list.filter((item) =>
      this.filters.every((f) => item[f.column] === f.value)
    );

    if (this.orderBy) {
      filtered.sort((a, b) => {
        const valA = a[this.orderBy.column];
        const valB = b[this.orderBy.column];
        if (valA < valB) return this.orderBy.ascending ? -1 : 1;
        if (valA > valB) return this.orderBy.ascending ? 1 : -1;
        return 0;
      });
    }

    if (this.isSingle) {
      if (filtered.length === 0) {
        return { data: null, error: { code: "PGRST116", message: "No rows found" } };
      }
      return { data: filtered[0], error: null };
    }

    return { data: filtered, error: null };
  }
}

class LocalStore {
  constructor() {
    this.dir = path.resolve(process.cwd(), "data");
    try {
      if (!fs.existsSync(this.dir)) {
        fs.mkdirSync(this.dir, { recursive: true });
      }
    } catch { /* ignore */ }
  }

  getFilePath(table) {
    return path.join(this.dir, `${table}.json`);
  }

  read(table) {
    try {
      const file = this.getFilePath(table);
      if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf-8"));
    } catch { /* ignore */ }
    return [];
  }

  write(table, data) {
    try {
      const file = this.getFilePath(table);
      fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
    } catch (err) {
      console.error("LocalStore write error:", err.message);
    }
  }

  from(table) { return new LocalTableQuery(table, this); }

  get auth() {
    return {
      getUser: async (token) => {
        if (!token) return { data: { user: null }, error: new Error("No token") };
        return {
          data: {
            user: { id: "00000000-0000-0000-0000-000000000001", email: "trainer@example.com" }
          },
          error: null
        };
      },
      signUp: async ({ email }) => ({
        data: {
          user: { id: "00000000-0000-0000-0000-000000000001", email },
          session: {
            access_token: "dev-session-token",
            user: { id: "00000000-0000-0000-0000-000000000001", email }
          }
        },
        error: null
      }),
      signInWithPassword: async ({ email }) => ({
        data: {
          user: { id: "00000000-0000-0000-0000-000000000001", email },
          session: {
            access_token: "dev-session-token",
            user: { id: "00000000-0000-0000-0000-000000000001", email }
          }
        },
        error: null
      })
    };
  }
}

let client = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY) {
  try {
    client = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY
    );
  } catch (err) {
    console.warn("Failed to initialize Supabase client:", err.message);
  }
}

export const supabase = client;
export const getSupabase = () => client;
export default client;
