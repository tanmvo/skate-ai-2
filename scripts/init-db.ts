/**
 * Database initialization script
 * Creates the default user and sets up initial data
 */

import { prisma } from "../lib/prisma";
import { ensureDefaultUser } from "../lib/auth";

async function initializeDatabase() {
  try {
    console.log("🚀 Initializing database...");
    
    // Create default user
    await ensureDefaultUser();
    
    console.log("✅ Database initialization complete!");
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if this script is executed directly
if (require.main === module) {
  initializeDatabase();
}