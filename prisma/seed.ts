import { PrismaClient } from "@prisma/client";
import { seedKillian } from "../src/lib/seed";

const prisma = new PrismaClient();

async function main() {
  const me = await seedKillian(prisma);
  console.log("Seed OK pour", me.firstName);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
