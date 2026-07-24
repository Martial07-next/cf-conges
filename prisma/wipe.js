const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// A lancer UNE FOIS pour repartir d'une base vierge si vous avez déjà les
// 15 comptes de démonstration en production. Supprime tout, puis relancez
// `npm run seed` juste après pour recréer les types de congés + le compte admin.
//
// Usage : npm run wipe

async function main() {
  console.log("Suppression des données existantes...");

  await prisma.notification.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.leaveRequest.deleteMany({});
  await prisma.leaveBalance.deleteMany({});
  await prisma.leaveTypeMotif.deleteMany({});
  await prisma.accrualRun.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.leaveType.deleteMany({});

  console.log("Base vidée. Lancez maintenant : npm run seed");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
