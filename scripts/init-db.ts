/**
 * Database initialization script
 * Sets up database schema and connections
 *
 * Note: With Auth.js, users are created through authentication flow
 * No need to pre-create default users
 */

import { prisma } from "../lib/prisma";

async function initializeDatabase() {
  try {
    console.log("🚀 Initializing database...");

    // Test database connection
    await prisma.$connect();
    console.log("✅ Database connection established");

    // Note: With Auth.js authentication, users are created through signup flow
    // No need to create default users manually

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