import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const images = await prisma.reviewImage.findMany({
    take: 10,
    select: {
      id: true,
      imageUrl: true,
      isApproved: true,
      review: {
        select: {
          id: true,
          comment: true,
          user: {
            select: {
              fullName: true,
            },
          },
        },
      },
    },
  });

  console.log(JSON.stringify(images, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
