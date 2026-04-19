import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: "hunhunhun231@gmail.com" },
      select: { id: true, status: true, roleId: true, passwordHash: true }
    });
    if (user) {
      const isBcrypt = user.passwordHash.startsWith("$2a$") || user.passwordHash.startsWith("$2b$") || user.passwordHash.startsWith("$2y$");
      console.log(JSON.stringify({ id: user.id, status: user.status, roleId: user.roleId, isBcryptHash: isBcrypt }, null, 2));
    } else {
      console.log("User not found");
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}
main();
