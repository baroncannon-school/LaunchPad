import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MilestonesPageClient } from "./milestones-page-client";

export default async function MilestonesManagementPage() {
  await requireRole("INSTRUCTOR");

  const milestones = await prisma.milestoneDefinition.findMany({
    orderBy: { sequenceOrder: "asc" },
  });

  return <MilestonesPageClient milestones={milestones} />;
}
