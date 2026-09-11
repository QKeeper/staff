import { Role } from "@prisma/client";
import { prisma } from "../db/prisma.js";

async function main() {
  const args = process.argv.slice(2);
  const username = args[0];
  const roleInput = args[1]?.toUpperCase();

  if (!username || !roleInput) {
    console.error("Usage: pnpm set-role <username> <ADMIN|MODERATOR|USER>");
    process.exit(1);
  }

  const validRoles: Role[] = ["USER", "ADMIN", "MODERATOR"];
  if (!validRoles.includes(roleInput as Role)) {
    console.error(
      `Invalid role: "${roleInput}". Allowed roles: ${validRoles.join(", ")}`,
    );
    process.exit(1);
  }

  const targetRole = roleInput as Role;

  const user = await prisma.user.findFirst({
    where: {
      username: {
        equals: username,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
    },
  });

  if (!user) {
    console.error(`Error: User with username "${username}" not found.`);
    process.exit(1);
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { role: targetRole },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
    },
  });

  console.log(
    `✅ Successfully updated role for "${updatedUser.username}" (${updatedUser.email}): ${user.role} -> ${updatedUser.role}`,
  );
}

main()
  .catch((err) => {
    console.error("Failed to update user role:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
