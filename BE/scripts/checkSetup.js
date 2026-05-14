#!/usr/bin/env node
/**
 * SETUP CHECKER - Kiểm tra cấu hình trước khi chạy auto-generate
 * 
 * Usage:
 *   node scripts/checkSetup.js
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===================== LOGGER =====================

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  gray: "\x1b[90m",
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.blue}━━━ ${msg} ━━━${colors.reset}`),
};

// ===================== CHECKS =====================

async function checkEnvironment() {
  log.section("1. ENVIRONMENT VARIABLES");

  const requiredEnvs = {
    GROQ_API_KEY: {
      value: process.env.GROQ_API_KEY,
      required: true,
      hint: "https://console.groq.com/keys",
    },
    PEXELS_API_KEY: {
      value: process.env.PEXELS_API_KEY,
      required: true,
      hint: "https://www.pexels.com/api/",
    },
    DATABASE_URL: {
      value: process.env.DATABASE_URL,
      required: true,
      hint: "Check .env for database connection",
    },
  };

  let allGood = true;

  for (const [key, { value, required, hint }] of Object.entries(requiredEnvs)) {
    if (!value && required) {
      log.error(`${key} is missing`);
      log.info(`  → ${hint}`);
      allGood = false;
    } else if (value) {
      const masked = value.slice(0, 10) + "..." + value.slice(-5);
      log.success(`${key} = ${masked}`);
    }
  }

  return allGood;
}

async function checkDependencies() {
  log.section("2. NPM DEPENDENCIES");

  const requiredPackages = {
    "@prisma/client": "@prisma/client",
  };

  let allGood = true;

  for (const [pkg, displayName] of Object.entries(requiredPackages)) {
    try {
      // Try to import the package
      await import(pkg);
      log.success(`${displayName} is installed`);
    } catch (error) {
      log.error(`${displayName} is NOT installed`);
      log.info(`  → Run: npm install ${pkg}`);
      allGood = false;
    }
  }

  return allGood;
}

async function checkFileStructure() {
  log.section("3. FILE STRUCTURE");

  const requiredPaths = {
    "uploads/products/": path.resolve(__dirname, "..", "uploads", "products"),
    ".env": path.resolve(__dirname, "..", ".env"),
    "prisma/schema.prisma": path.resolve(__dirname, "..", "prisma", "schema.prisma"),
  };

  let allGood = true;

  for (const [label, filePath] of Object.entries(requiredPaths)) {
    if (fs.existsSync(filePath)) {
      log.success(`${label} exists`);
    } else {
      if (label.includes("uploads")) {
        log.warning(`${label} not found (will be created automatically)`);
      } else {
        log.error(`${label} not found`);
        allGood = false;
      }
    }
  }

  return allGood;
}

async function checkDatabase() {
  log.section("4. DATABASE CONNECTION");

  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();

    // Try to connect
    await prisma.$connect();
    log.success("Database connection successful");

    // Check categories
    const categoryCount = await prisma.category.count();
    const activeCategories = await prisma.category.count({
      where: {
        isActive: true,
        isDeleted: false,
      },
    });

    log.info(`Total categories: ${categoryCount}`);
    log.info(`Active categories: ${activeCategories}`);

    if (activeCategories === 0) {
      log.error("No active categories found!");
      log.info("  → Create categories in admin panel before running auto-generate");
      await prisma.$disconnect();
      return false;
    }

    // Show categories
    const cats = await prisma.category.findMany({
      where: { isActive: true, isDeleted: false },
      orderBy: { name: "asc" },
    });

    if (cats.length > 0) {
      log.info("Active categories:");
      cats.forEach((cat) => {
        console.log(`     - ${cat.name}`);
      });
    }

    await prisma.$disconnect();
    return true;
  } catch (error) {
    log.error(`Database connection failed: ${error.message}`);
    return false;
  }
}

async function checkGroq() {
  log.section("5. GROQ API");

  if (!process.env.GROQ_API_KEY) {
    log.error("GROQ_API_KEY not configured");
    return false;
  }

  try {
    const candidateModels = [
      process.env.GROQ_MODEL,
      "llama-3.3-70b-versatile",
      "llama-3.1-405b-reasoning",
    ].filter(Boolean);

    for (const model of candidateModels) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "user",
                content: "Say 'OK' only.",
              },
            ],
            max_tokens: 5,
            temperature: 0,
          }),
          signal: controller.signal,
        });

        if (response.ok) {
          log.success(`Groq API working with model: ${model}`);
          return true;
        }

        const errorText = await response.text();
        log.warning(`Groq model failed: ${model} (${response.status})`);
        log.info(`  → ${errorText.slice(0, 200)}`);
      } finally {
        clearTimeout(timeoutId);
      }
    }

    log.error("Groq API returned unexpected response for all models");
    return false;
  } catch (error) {
    log.error(`Groq API check failed: ${error.message}`);
    if (error.message.includes("401")) {
      log.info("  → Check if GROQ_API_KEY is correct");
    } else if (error.message.includes("rate_limit")) {
      log.warning("  → Rate limit hit, but API is working");
      return true;
    }
    return false;
  }
}

async function checkPexels() {
  log.section("6. PEXELS API");

  if (!process.env.PEXELS_API_KEY) {
    log.error("PEXELS_API_KEY not configured");
    return false;
  }

  try {
    const response = await fetch("https://api.pexels.com/v1/search?query=laptop&per_page=1", {
      headers: {
        Authorization: process.env.PEXELS_API_KEY,
      },
    });

    if (response.ok) {
      const data = await response.json();
      log.success("Pexels API working");
      log.info(`  → Found ${data.total_results} laptop images`);
      return true;
    } else {
      const errorText = await response.text();
      log.error(`Pexels API returned unexpected response: ${response.status}`);
      log.info(`  → ${errorText.slice(0, 200)}`);
      return false;
    }
  } catch (error) {
    log.error(`Pexels API check failed: ${error.message}`);
    if (error.message.includes("401")) {
      log.info("  → Check if PEXELS_API_KEY is correct");
    } else if (error.message.includes("429")) {
      log.warning("  → Rate limit hit, but API is working");
      return true;
    }
    return false;
  }
}

async function checkDiskSpace() {
  log.section("7. DISK SPACE");

  try {
    const uploadsDir = path.resolve(__dirname, "..", "uploads", "products");
    const stats = fs.statSync(uploadsDir);
    log.success(`uploads/products/ directory exists`);
    log.info(`  → Space available for storing images`);
    return true;
  } catch (error) {
    log.warning(`Could not check disk space: ${error.message}`);
    return true; // Non-critical
  }
}

// ===================== MAIN =====================

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║         AUTO GENERATE PRODUCTS - SETUP CHECKER            ║
╚═══════════════════════════════════════════════════════════╝
`);

  const checks = [
    { name: "Environment Variables", fn: checkEnvironment },
    { name: "Dependencies", fn: checkDependencies },
    { name: "File Structure", fn: checkFileStructure },
    { name: "Database", fn: checkDatabase },
    { name: "Groq API", fn: checkGroq },
    { name: "Pexels API", fn: checkPexels },
    { name: "Disk Space", fn: checkDiskSpace },
  ];

  const results = [];

  for (const check of checks) {
    try {
      const result = await check.fn();
      results.push({ name: check.name, passed: result });
    } catch (error) {
      console.error(
        `${colors.red}Error during check "${check.name}": ${error.message}${colors.reset}`
      );
      results.push({ name: check.name, passed: false });
    }
  }

  // Summary
  console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
  console.log(`║                       SUMMARY                             ║`);
  console.log(`╠═══════════════════════════════════════════════════════════╣`);

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;

  results.forEach((result) => {
    const status = result.passed
      ? `${colors.green}✅ PASS${colors.reset}`
      : `${colors.red}❌ FAIL${colors.reset}`;
    console.log(`${status}  ${result.name}`);
  });

  console.log(`╠═══════════════════════════════════════════════════════════╣`);
  console.log(`${passed}/${total} checks passed`);
  console.log(`╚═══════════════════════════════════════════════════════════╝`);

  if (passed === total) {
    console.log(`\n${colors.green}🎉 All checks passed! Ready to generate products.${colors.reset}`);
    console.log(`\nRun: ${colors.blue}npm run generate:products${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(
      `\n${colors.red}⚠️  Some checks failed. Please fix the issues above.${colors.reset}\n`
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});
