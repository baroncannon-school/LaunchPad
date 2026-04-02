// ============================================================================
// LaunchPad — Seed Data
// Milestone definitions from Simulation_Milestone_Tracker_Spring_26.xlsx
// Scoring rules from the Variables sheet
// ============================================================================

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding LaunchPad database...\n");

  // ==========================================================================
  // 1. SCORING RULES (from Variables sheet)
  // ==========================================================================

  const scoringRules = [
    { label: 'Group "Required"',  teamRole: "MEMBER", requirement: "REQUIRED", multiplier: 0.93  },
    { label: 'Incomplete "Required"', teamRole: "MEMBER", requirement: "REQUIRED", multiplier: 0.60 }, // Stored as reference; applied when incomplete
    { label: 'Group "Optional"',  teamRole: "MEMBER", requirement: "OPTIONAL", multiplier: 0.50  },
    { label: 'Lead "Required"',   teamRole: "LEAD",   requirement: "REQUIRED", multiplier: 0.25  },
    { label: 'Lead "Optional"',   teamRole: "LEAD",   requirement: "OPTIONAL", multiplier: 0.125 },
  ];

  for (const rule of scoringRules) {
    await prisma.scoringRule.upsert({
      where: { teamRole_requirement: { teamRole: rule.teamRole, requirement: rule.requirement } },
      update: { multiplier: rule.multiplier, label: rule.label },
      create: rule,
    });
  }
  console.log(`✓ Seeded ${scoringRules.length} scoring rules`);

  // ==========================================================================
  // 2. MILESTONE DEFINITIONS (from Verticle Order sheet — all 60 milestones)
  // ==========================================================================

  const milestones = [
    // --- Phase: Initial Development ---
    { seq:  1, title: "Identify a business idea or opportunity",                              period: "P1_NOV", ownership: "BOTH", req: "REQUIRED", offering: "BOTH", phase: "Initial Development" },
    { seq:  2, title: "Conduct market research",                                              period: "P2_DEC", ownership: "BOTH", req: "REQUIRED", offering: "BOTH", phase: "Initial Development" },
    { seq:  3, title: "Determine target audience",                                            period: "P2_DEC", ownership: "BOTH", req: "REQUIRED", offering: "BOTH", phase: "Initial Development" },
    { seq:  4, title: "Analyze competition",                                                  period: "P2_DEC", ownership: "BOTH", req: "REQUIRED", offering: "BOTH", phase: "Initial Development" },
    { seq:  5, title: "Develop a unique value proposition",                                   period: "P2_DEC", ownership: "BOTH", req: "REQUIRED", offering: "BOTH", phase: "Initial Development" },
    { seq:  6, title: "Create a business name",                                               period: "P2_DEC", ownership: "BOTH", req: "REQUIRED", offering: "BOTH", phase: "Initial Development" },
    { seq:  7, title: "Write a Lean Business Plan",                                           period: "P2_DEC", ownership: "BOTH", req: "REQUIRED", offering: "BOTH", phase: "Initial Development" },

    // --- Phase: Fundraising Simulation ---
    { seq:  8, title: "Develop a Marketing Plan",                                             period: "P3_JAN", ownership: "BOTH", req: "REQUIRED", offering: "BOTH", phase: "Fundraising Simulation" },
    { seq:  9, title: "Prepare an Operations Plan",                                           period: "P3_JAN", ownership: "BOTH", req: "REQUIRED", offering: "BOTH", phase: "Fundraising Simulation" },
    { seq: 10, title: "Set financial goals and projections",                                  period: "P3_JAN", ownership: "BOTH", req: "REQUIRED", offering: "BOTH", phase: "Fundraising Simulation" },
    { seq: 11, title: "Prepare a Pitch Deck",                                                 period: "P3_JAN", ownership: "BOTH", req: "REQUIRED", offering: "BOTH", phase: "Fundraising Simulation" },
    { seq: 12, title: "Submit Dealum Application",                                            period: "P3_JAN", ownership: "BOTH", req: "REQUIRED", offering: "BOTH", phase: "Fundraising Simulation" },
    { seq: 13, title: "Sign Up for First Pitch",                                              period: "P3_JAN", ownership: "BOTH", req: "REQUIRED", offering: "BOTH", phase: "Fundraising Simulation" },
    { seq: 14, title: "Sign up for DD Call",                                                  period: "P3_JAN", ownership: "BOTH", req: "REQUIRED", offering: "BOTH", phase: "Fundraising Simulation" },
    { seq: 15, title: "Secure initial funding / investment / resources",                      period: "P3_JAN", ownership: "SELF", req: "REQUIRED", offering: "PRODUCT", phase: "Fundraising Simulation" },

    // --- Phase: Sales Strategy & Going to Market ---
    { seq: 16, title: "Establish a legal business structure (Sole Prop, Partnership, etc.)",  period: "P4_FEB", ownership: "SELF", req: "OPTIONAL", offering: "BOTH", phase: "Sales Strategy & Going to Market" },
    { seq: 17, title: "Obtain necessary licenses and permits (CFO Permit, etc.)",             period: "P4_FEB", ownership: "SELF", req: "OPTIONAL", offering: "PRODUCT", phase: "Sales Strategy & Going to Market" },
    { seq: 18, title: "Obtain Seller's Permit (Sales Tax Permit)",                            period: "P4_FEB", ownership: "SELF", req: "REQUIRED", offering: "PRODUCT", phase: "Sales Strategy & Going to Market" },
    { seq: 19, title: "Obtain insurance",                                                     period: "P4_FEB", ownership: "SELF", req: "OPTIONAL", offering: "BOTH", phase: "Sales Strategy & Going to Market" },
    { seq: 20, title: "Open a business bank account",                                         period: "P4_FEB", ownership: "SELF", req: "OPTIONAL", offering: "BOTH", phase: "Sales Strategy & Going to Market" },
    { seq: 21, title: "Design a logo and Brand System",                                       period: "P4_FEB", ownership: "BOTH", req: "REQUIRED", offering: "BOTH", phase: "Sales Strategy & Going to Market" },
    { seq: 22, title: "Develop a minimum viable product (MVP) or service",                    period: "P4_FEB", ownership: "BOTH", req: "REQUIRED", offering: "BOTH", phase: "Sales Strategy & Going to Market" },
    { seq: 23, title: "Generate first sale or client",                                        period: "P4_FEB", ownership: "BOTH", req: "REQUIRED", offering: "BOTH", phase: "Sales Strategy & Going to Market" },
    { seq: 24, title: "Gather User Feedback from first sales",                                period: "P4_FEB", ownership: "BOTH", req: "REQUIRED", offering: "BOTH", phase: "Sales Strategy & Going to Market" },
    { seq: 25, title: "Refine the product or service",                                        period: "P4_FEB", ownership: "BOTH", req: "REQUIRED", offering: "BOTH", phase: "Sales Strategy & Going to Market" },
    { seq: 26, title: "Set Up a formal sales channel",                                        period: "P4_FEB", ownership: "BOTH", req: "OPTIONAL", offering: "BOTH", phase: "Sales Strategy & Going to Market" },
    { seq: 27, title: "Refine Marketing Plan w/ Sales Strategy",                              period: "P4_FEB", ownership: "BOTH", req: "REQUIRED", offering: "BOTH", phase: "Sales Strategy & Going to Market" },
    { seq: 28, title: "Establish online presence (website, social media, etc.)",               period: "P4_FEB", ownership: "BOTH", req: "OPTIONAL", offering: "BOTH", phase: "Sales Strategy & Going to Market" },
    { seq: 29, title: "Develop promotional materials (signage, brochures, etc.)",              period: "P4_FEB", ownership: "BOTH", req: "OPTIONAL", offering: "BOTH", phase: "Sales Strategy & Going to Market" },
    { seq: 30, title: "Establish Digital Point of Sale (Quickbooks, Venmo, etc.)",             period: "P4_FEB", ownership: "BOTH", req: "REQUIRED", offering: "BOTH", phase: "Sales Strategy & Going to Market" },
    { seq: 31, title: "Achieve $250 Revenue or 15 Customers or 15 Transactions",              period: "P4_FEB", ownership: "BOTH", req: "OPTIONAL", offering: "BOTH", phase: "Sales Strategy & Going to Market" },
    { seq: 32, title: "Submit February Financial Statements",                                  period: "P4_FEB", ownership: "BOTH", req: "REQUIRED", offering: "BOTH", phase: "Sales Strategy & Going to Market", evidenceRequired: true, evidenceType: "FILE" },

    // --- Phase: Product Market Fit & Attaining Profitability ---
    { seq: 33, title: "Generate first repeat sale",                                            period: "P5_MAR", ownership: "BOTH", req: "REQUIRED", offering: "BOTH", phase: "Product Market Fit & Attaining Profitability" },
    { seq: 34, title: "Implement customer feedback loop",                                      period: "P5_MAR", ownership: "BOTH", req: "REQUIRED", offering: "BOTH", phase: "Product Market Fit & Attaining Profitability" },
    { seq: 35, title: "Develop a Customer Retention Strategy",                                 period: "P5_MAR", ownership: "BOTH", req: "REQUIRED", offering: "BOTH", phase: "Product Market Fit & Attaining Profitability" },
    { seq: 36, title: "Achieve $500 Revenue or 25 Customers or 25 Transactions",              period: "P5_MAR", ownership: "BOTH", req: "OPTIONAL", offering: "BOTH", phase: "Product Market Fit & Attaining Profitability" },
    { seq: 37, title: "Achieve 1 or more customers returning 2 or more times",                period: "P5_MAR", ownership: "BOTH", req: "REQUIRED", offering: "BOTH", phase: "Product Market Fit & Attaining Profitability" },
    { seq: 38, title: "Optimize operations and processes",                                     period: "P5_MAR", ownership: "BOTH", req: "REQUIRED", offering: "BOTH", phase: "Product Market Fit & Attaining Profitability" },
    { seq: 39, title: "Identify & Track Marketing KPIs",                                       period: "P5_MAR", ownership: "BOTH", req: "REQUIRED", offering: "BOTH", phase: "Product Market Fit & Attaining Profitability" },
    { seq: 40, title: "Identify & Track Operations KPIs",                                      period: "P5_MAR", ownership: "BOTH", req: "REQUIRED", offering: "BOTH", phase: "Product Market Fit & Attaining Profitability" },
    { seq: 41, title: "Identify & Track Financial KPIs",                                       period: "P5_MAR", ownership: "BOTH", req: "REQUIRED", offering: "BOTH", phase: "Product Market Fit & Attaining Profitability" },
    { seq: 42, title: "Expand product or service offerings",                                   period: "P5_MAR", ownership: "BOTH", req: "OPTIONAL", offering: "BOTH", phase: "Product Market Fit & Attaining Profitability" },
    { seq: 43, title: "Achieve 5 or more customers returning 2 or more times",                period: "P5_MAR", ownership: "BOTH", req: "OPTIONAL", offering: "BOTH", phase: "Product Market Fit & Attaining Profitability" },
    { seq: 44, title: "Analyze sales data, identify trends, & make refinements",               period: "P5_MAR", ownership: "BOTH", req: "REQUIRED", offering: "BOTH", phase: "Product Market Fit & Attaining Profitability" },
    { seq: 45, title: "Submit March Financial Statements",                                     period: "P5_MAR", ownership: "BOTH", req: "REQUIRED", offering: "BOTH", phase: "Product Market Fit & Attaining Profitability", evidenceRequired: true, evidenceType: "FILE" },

    // --- Phase: Scaling & Winding Down ---
    { seq: 46, title: "Reach break-even point",                                                period: "P6_APR", ownership: "BOTH", req: "REQUIRED", offering: "PRODUCT", phase: "Scaling & Winding Down" },
    { seq: 47, title: "Achieve $1,000 Revenue or 50 Customers or 50 Transactions",            period: "P6_APR", ownership: "BOTH", req: "OPTIONAL", offering: "BOTH", phase: "Scaling & Winding Down" },
    { seq: 48, title: "Explore New Markets or Demographics",                                   period: "P6_APR", ownership: "BOTH", req: "OPTIONAL", offering: "BOTH", phase: "Scaling & Winding Down" },
    { seq: 49, title: "Achieve $1,500 Revenue or 75 Customers or 75 Transactions",            period: "P6_APR", ownership: "BOTH", req: "OPTIONAL", offering: "BOTH", phase: "Scaling & Winding Down" },
    { seq: 50, title: "Achieve 10 or more customers returning 2 or more times",               period: "P6_APR", ownership: "BOTH", req: "OPTIONAL", offering: "BOTH", phase: "Scaling & Winding Down" },
    { seq: 51, title: "Achieve $2,000 Revenue or 100 Customers or 100 Transactions",          period: "P6_APR", ownership: "BOTH", req: "OPTIONAL", offering: "BOTH", phase: "Scaling & Winding Down" },
    { seq: 52, title: "Implement a succession plan or exit strategy",                          period: "P6_APR", ownership: "SCHOOL", req: "REQUIRED", offering: "BOTH", phase: "Scaling & Winding Down" },
    { seq: 53, title: "Submit April Financial Statements",                                     period: "P6_APR", ownership: "BOTH", req: "REQUIRED", offering: "BOTH", phase: "Scaling & Winding Down", evidenceRequired: true, evidenceType: "FILE" },

    // --- Phase: Winding Down ---
    { seq: 54, title: "Liquidate the Business",                                                period: "P7_MAY", ownership: "SCHOOL", req: "REQUIRED", offering: "BOTH", phase: "Winding Down" },
    { seq: 55, title: "Prepare Exhibit for Design Showcase",                                   period: "P7_MAY", ownership: "BOTH", req: "REQUIRED", offering: "BOTH", phase: "Winding Down" },
    { seq: 56, title: "Participate in Design Showcase",                                        period: "P7_MAY", ownership: "BOTH", req: "REQUIRED", offering: "BOTH", phase: "Winding Down" },

    // --- Phase: Advanced Milestones ---
    { seq: 57, title: "Achieve $2,500 Revenue or 125 Customers or 125 Transactions",          period: "P8_OTHER", ownership: "BOTH", req: "OPTIONAL", offering: "BOTH", phase: "Advanced Milestones" },
    { seq: 58, title: "Achieve $3,000 Revenue or 150 Customers or 150 Transactions",          period: "P8_OTHER", ownership: "BOTH", req: "OPTIONAL", offering: "BOTH", phase: "Advanced Milestones" },
    { seq: 59, title: "Form strategic partnerships or collaborations",                         period: "P8_OTHER", ownership: "BOTH", req: "OPTIONAL", offering: "BOTH", phase: "Advanced Milestones" },
    { seq: 60, title: "Develop a customer referral program",                                   period: "P8_OTHER", ownership: "BOTH", req: "OPTIONAL", offering: "BOTH", phase: "Advanced Milestones" },
  ];

  for (const m of milestones) {
    await prisma.milestoneDefinition.upsert({
      where: { id: `milestone-${String(m.seq).padStart(3, "0")}` },
      update: {
        title: m.title,
        period: m.period,
        ownershipFilter: m.ownership,
        requirementLevel: m.req,
        offeringFilter: m.offering,
        sequenceOrder: m.seq,
        phaseLabel: m.phase,
        evidenceRequired: m.evidenceRequired ?? false,
        evidenceType: m.evidenceType ?? "NONE",
      },
      create: {
        id: `milestone-${String(m.seq).padStart(3, "0")}`,
        title: m.title,
        period: m.period,
        ownershipFilter: m.ownership,
        requirementLevel: m.req,
        offeringFilter: m.offering,
        sequenceOrder: m.seq,
        phaseLabel: m.phase,
        evidenceRequired: m.evidenceRequired ?? false,
        evidenceType: m.evidenceType ?? "NONE",
      },
    });
  }
  console.log(`✓ Seeded ${milestones.length} milestone definitions`);

  // ==========================================================================
  // 3. SEMESTER GRADE WEIGHTS (from Syllabus)
  // ==========================================================================

  const academicYear = await prisma.academicYear.upsert({
    where: { id: "ay-2025-2026" },
    update: {},
    create: {
      id: "ay-2025-2026",
      label: "2025-2026",
      startDate: new Date("2025-08-18"),
      endDate: new Date("2026-06-05"),
      isActive: true,
    },
  });

  await prisma.semesterConfig.upsert({
    where: { academicYearId_semester: { academicYearId: academicYear.id, semester: "FALL" } },
    update: {},
    create: {
      academicYearId: academicYear.id,
      semester: "FALL",
      startDate: new Date("2025-08-18"),
      endDate: new Date("2026-01-16"),
      gradeWeights: {
        EXAM: 0.55,
        QUIZ: 0.15,
        AUTHENTIC_ASSESSMENT: 0.15,
        FINAL_EXAM: 0.15,
      },
    },
  });

  await prisma.semesterConfig.upsert({
    where: { academicYearId_semester: { academicYearId: academicYear.id, semester: "SPRING" } },
    update: {},
    create: {
      academicYearId: academicYear.id,
      semester: "SPRING",
      startDate: new Date("2026-01-20"),
      endDate: new Date("2026-06-05"),
      gradeWeights: {
        EXAM: 0.25,
        MILESTONE_TRACKER: 0.50,
        QUIZ: 0.05,
        AUTHENTIC_ASSESSMENT: 0.05,
        DESIGN_SHOWCASE: 0.15,
      },
    },
  });

  console.log("✓ Seeded academic year and semester configs");

  // ==========================================================================
  // 4. SECTIONS (Class Periods)
  // ==========================================================================

  for (const period of [3, 5, 6]) {
    await prisma.section.upsert({
      where: { academicYearId_period: { academicYearId: academicYear.id, period } },
      update: {},
      create: {
        academicYearId: academicYear.id,
        period,
        label: `Period ${period}`,
      },
    });
  }
  console.log("✓ Seeded 3 sections (Periods 3, 5, 6)");

  // ==========================================================================
  // 5. CURRICULUM UNITS (from Syllabus)
  // ==========================================================================

  const fallSemester = await prisma.semesterConfig.findFirst({
    where: { academicYearId: academicYear.id, semester: "FALL" },
  });

  const springSemester = await prisma.semesterConfig.findFirst({
    where: { academicYearId: academicYear.id, semester: "SPRING" },
  });

  const units = [
    // Fall semester units
    { semesterId: fallSemester!.id, title: "Unit 1: Marketing",       seq: 1 },
    { semesterId: fallSemester!.id, title: "Unit 2: Operations",      seq: 2 },
    { semesterId: fallSemester!.id, title: "Unit 3: Finance",         seq: 3 },
    { semesterId: fallSemester!.id, title: "Unit 4: Value Creation",  seq: 4 },
    // Spring semester units
    { semesterId: springSemester!.id, title: "Fundraising Simulation",  seq: 1 },
    { semesterId: springSemester!.id, title: "Unit 6: Sales & Marketing", seq: 2 },
    { semesterId: springSemester!.id, title: "Venture Simulation",      seq: 3 },
    { semesterId: springSemester!.id, title: "Design Showcase",         seq: 4 },
  ];

  for (const u of units) {
    await prisma.unit.create({
      data: {
        semesterConfigId: u.semesterId,
        title: u.title,
        sequenceOrder: u.seq,
        isPublished: true,
      },
    });
  }
  console.log(`✓ Seeded ${units.length} curriculum units`);

  console.log("\n✅ Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
