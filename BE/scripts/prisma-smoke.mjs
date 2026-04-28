import { prisma } from "../src/db/prisma.js";

async function main() {
  // These includes must exist if schema.prisma relations are in sync with the generated client.
  await prisma.orderItem.findMany({
    take: 1,
    include: {
      reviews: {
        take: 1,
        select: { id: true },
      },
    },
  });

  await prisma.reviewReply.findMany({
    take: 1,
    include: {
      sender: {
        select: { id: true },
      },
    },
  });

  console.log("PRISMA_SMOKE_OK");
}

main()
  .catch((err) => {
    console.error("PRISMA_SMOKE_FAIL");
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
