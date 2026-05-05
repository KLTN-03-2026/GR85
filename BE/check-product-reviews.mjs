import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Find the product and its reviews
  const product = await prisma.product.findFirst({
    where: {
      reviews: {
        some: {
          images: {
            some: {},
          },
        },
      },
    },
    include: {
      reviews: {
        where: { isHidden: false },
        include: {
          images: {
            where: { isApproved: true },
            orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
          },
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          replies: {
            orderBy: { createdAt: "asc" },
            take: 200,
          },
        },
        orderBy: [{ createdAt: "desc" }],
        take: 500,
      },
    },
  });

  if (product) {
    console.log("Product:", product.name);
    console.log("Reviews with images:");
    product.reviews.forEach((review) => {
      console.log(`  - ${review.user.fullName}: ${review.comment}`);
      console.log(`    Images: ${review.images.length}`);
      review.images.forEach((img) => {
        console.log(`      - ${img.imageUrl} (approved: ${img.isApproved})`);
      });
    });
  } else {
    console.log("No products with review images found");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
