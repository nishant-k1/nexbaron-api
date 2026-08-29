import mongoose from "mongoose";
import "dotenv/config";

const KEEP = new Set(["staff", "staffs", "services"]);

async function main() {
  const uri = process.env.DATABASE_URL;
  if (!uri) throw new Error("DATABASE_URL not set");
  console.log("Connecting to", uri.replace(/\/\/.*@/, "//***@"));
  const conn = await mongoose.createConnection(uri).asPromise();
  const db = conn.db;
  if (!db) throw new Error("No db");
  const cols = await db.listCollections().toArray();
  console.log("Collections:", cols.map((c) => c.name).join(", "));
  for (const col of cols) {
    if (KEEP.has(col.name)) {
      const c = await db.collection(col.name).countDocuments();
      console.log(`KEEP ${col.name}: ${c} (skipped)`);
      continue;
    }
    const res = await db.collection(col.name).deleteMany({});
    console.log(`CLEANED ${col.name}: deleted ${res.deletedCount}`);
  }
  await conn.close();
  console.log("Done — dummy Hub data cleaned, staff/services kept. Refresh Hub to see empty states.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
