import { Router } from "express";
import { z } from "zod";

const router = Router();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

type FactTable = "orders" | "users" | "pageviews";

const DB: Record<
  FactTable,
  { fields: string[]; dimensions: string[]; filters: string[] }
> = {
  orders: {
    fields: ["order_id", "user_id", "amount", "created_at"],
    dimensions: ["country", "device", "channel"],
    filters: ["date_range", "country", "min_amount"],
  },
  users: {
    fields: ["user_id", "email", "age", "signup_at"],
    dimensions: ["cohort", "plan", "region"],
    filters: ["signup_range", "plan", "region"],
  },
  pageviews: {
    fields: ["event_id", "user_id", "url", "ts"],
    dimensions: ["browser", "utm_source", "utm_medium"],
    filters: ["ts_range", "browser", "utm_source"],
  },
};

const QuerySchema = z.object({
  factTable: z.enum(["orders", "users", "pageviews"]),
  joins: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(",").filter(Boolean) : [])),
});

router.get("/options", async (req, res) => {
  const parsed = QuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { factTable, joins } = parsed.data;

  // 关键：随机延迟制造竞态
  const delayMs = rand(200, 1200);
  await sleep(delayMs);

  const base = DB[factTable];
  const suffix = joins.length ? `(+${joins.join("+")})` : "";

  return res.json({
    factTable,
    joins,
    tables: [
      {
        name: "orders",
        fields: [
          { table: "orders", field: "order_id", type: "number" },
          { table: "orders", field: "user_id", type: "number" },
          { table: "orders", field: "amount", type: "number" },
          { table: "orders", field: "created_at", type: "date" },
        ],
      },
      {
        name: "users",
        fields: [
          { table: "users", field: "user_id", type: "number" },
          { table: "users", field: "email", type: "string" },
          { table: "users", field: "age", type: "number" },
          { table: "users", field: "signup_at", type: "date" },
        ],
      },
    ].filter((t) => t.name === factTable || joins.includes(t.name)),
    meta: { delayMs },
  });

});

export default router;
