#!/usr/bin/env tsx

/**
 * Development File Cleanup Script
 * 
 * Safely cleans up development files and database records for the default user.
 * This script is designed to work with shared production databases by only
 * targeting the specific development user (usr_mvp_dev_2025).
 */

import { prisma } from "../lib/prisma";
import { DEFAULT_USER_ID } from "../lib/constants";
import { existsSync, rmSync, readdirSync, statSync } from "fs";
import { join } from "path";

// Safety check: Only run in development
if (process.env.NODE_ENV === "production") {
  console.error("❌ Cleanup commands are disabled in production for safety");
  process.exit(1);
}

interface CleanupOptions {
  dryRun?: boolean;
  target?: 'files' | 'database' | 'all';
  confirm?: boolean;
}

async function main() {
  const args = process.argv.slice(2);
  const options: CleanupOptions = {
    dryRun: args.includes('--dry-run'),
    target: args.includes('--files') ? 'files' : 
            args.includes('--database') ? 'database' :
            args.includes('--all') ? 'all' : 'files',
    confirm: args.includes('--yes') || args.includes('-y'),
  };

  console.log(`🧹 Development File Cleanup (User: ${DEFAULT_USER_ID})`);
  console.log(`Target: ${options.target}, Dry Run: ${options.dryRun}`);
  console.log('─'.repeat(50));

  try {
    switch (options.target) {
      case 'files':
        await cleanupOrphanedFiles(options);
        break;
      case 'database':
        await cleanupOrphanedRecords(options);
        break;
      case 'all':
        await cleanupAll(options);
        break;
    }
    
    console.log('\n✅ Cleanup completed successfully');
  } catch (error) {
    console.error('\n❌ Cleanup failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Clean up files that exist on disk but not in database
 */
async function cleanupOrphanedFiles(options: CleanupOptions) {
  const devUploadsPath = join(process.cwd(), 'dev-uploads');
  
  if (!existsSync(devUploadsPath)) {
    console.log('📁 No dev-uploads directory found');
    return;
  }

  // Get all documents for the dev user from database
  const documents = await prisma.document.findMany({
    where: {
      study: { userId: DEFAULT_USER_ID },
      storageType: 'filesystem',
    },
    select: {
      storagePath: true,
      fileName: true,
      studyId: true,
    },
  });

  const validFilePaths = new Set(
    documents.map(doc => doc.storagePath).filter(Boolean)
  );

  console.log(`📋 Found ${documents.length} database records with file paths`);

  // Scan dev-uploads directory for all files
  const allFiles: string[] = [];
  const studyDirs = readdirSync(devUploadsPath);
  
  for (const studyDir of studyDirs) {
    const studyPath = join(devUploadsPath, studyDir);
    if (statSync(studyPath).isDirectory()) {
      const files = readdirSync(studyPath);
      for (const file of files) {
        allFiles.push(join(studyPath, file));
      }
    }
  }

  const orphanedFiles = allFiles.filter(filePath => !validFilePaths.has(filePath));
  
  console.log(`📁 Found ${allFiles.length} total files, ${orphanedFiles.length} orphaned`);

  if (orphanedFiles.length === 0) {
    console.log('✨ No orphaned files to clean up');
    return;
  }

  // Show what will be deleted
  console.log('\n🗑️  Orphaned files to be removed:');
  orphanedFiles.forEach(file => {
    const relativePath = file.replace(process.cwd() + '/', '');
    console.log(`  - ${relativePath}`);
  });

  if (options.dryRun) {
    console.log('\n🔍 Dry run mode - no files were actually deleted');
    return;
  }

  if (!options.confirm) {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise<string>((resolve) => {
      readline.question(`\n❓ Delete ${orphanedFiles.length} orphaned files? (y/N): `, resolve);
    });
    readline.close();

    if (answer.toLowerCase() !== 'y') {
      console.log('🚫 Cleanup cancelled');
      return;
    }
  }

  // Delete orphaned files
  let deletedCount = 0;
  for (const filePath of orphanedFiles) {
    try {
      rmSync(filePath);
      deletedCount++;
    } catch (error) {
      console.warn(`⚠️  Failed to delete ${filePath}:`, error);
    }
  }

  console.log(`\n🗑️  Deleted ${deletedCount} orphaned files`);
}

/**
 * Clean up database records that reference missing files
 */
async function cleanupOrphanedRecords(options: CleanupOptions) {
  // Get all documents for the dev user with storage paths
  const documents = await prisma.document.findMany({
    where: {
      study: { userId: DEFAULT_USER_ID },
      storageType: 'filesystem',
      storagePath: { not: null },
    },
    include: {
      _count: {
        select: { chunks: true },
      },
    },
  });

  console.log(`📋 Found ${documents.length} database records with file paths`);

  const orphanedRecords = documents.filter(doc => 
    doc.storagePath && !existsSync(doc.storagePath)
  );

  console.log(`💾 Found ${orphanedRecords.length} records with missing files`);

  if (orphanedRecords.length === 0) {
    console.log('✨ No orphaned database records to clean up');
    return;
  }

  // Show what will be deleted
  console.log('\n🗑️  Orphaned database records to be removed:');
  orphanedRecords.forEach(doc => {
    console.log(`  - ${doc.fileName} (${doc._count.chunks} chunks)`);
  });

  if (options.dryRun) {
    console.log('\n🔍 Dry run mode - no database records were actually deleted');
    return;
  }

  if (!options.confirm) {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise<string>((resolve) => {
      readline.question(`\n❓ Delete ${orphanedRecords.length} orphaned database records? (y/N): `, resolve);
    });
    readline.close();

    if (answer.toLowerCase() !== 'y') {
      console.log('🚫 Cleanup cancelled');
      return;
    }
  }

  // Delete orphaned records (chunks will be deleted automatically via cascade)
  const deletedRecords = await prisma.document.deleteMany({
    where: {
      id: { in: orphanedRecords.map(doc => doc.id) },
      study: { userId: DEFAULT_USER_ID }, // Double-safety check
    },
  });

  console.log(`\n🗑️  Deleted ${deletedRecords.count} orphaned database records`);
}

/**
 * Clean up everything for the dev user
 */
async function cleanupAll(options: CleanupOptions) {
  const devUploadsPath = join(process.cwd(), 'dev-uploads');
  
  // Get counts for confirmation
  const documentCount = await prisma.document.count({
    where: { study: { userId: DEFAULT_USER_ID } },
  });

  const chunkCount = await prisma.documentChunk.count({
    where: { document: { study: { userId: DEFAULT_USER_ID } } },
  });

  const messageCount = await prisma.chatMessage.count({
    where: { study: { userId: DEFAULT_USER_ID } },
  });

  console.log('🧹 COMPLETE CLEANUP - This will remove:');
  console.log(`  - All files in dev-uploads/ directory`);
  console.log(`  - ${documentCount} documents`);
  console.log(`  - ${chunkCount} document chunks`);
  console.log(`  - ${messageCount} chat messages`);
  console.log(`  - All studies for user: ${DEFAULT_USER_ID}`);

  if (options.dryRun) {
    console.log('\n🔍 Dry run mode - nothing was actually deleted');
    return;
  }

  if (!options.confirm) {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise<string>((resolve) => {
      readline.question(`\n❓ DANGER: This will delete ALL dev data. Continue? (y/N): `, resolve);
    });
    readline.close();

    if (answer.toLowerCase() !== 'y') {
      console.log('🚫 Cleanup cancelled');
      return;
    }
  }

  // Delete all studies for the dev user (cascades to documents and messages)
  const deletedStudies = await prisma.study.deleteMany({
    where: { userId: DEFAULT_USER_ID },
  });

  // Remove dev-uploads directory
  if (existsSync(devUploadsPath)) {
    rmSync(devUploadsPath, { recursive: true, force: true });
    console.log('🗑️  Removed dev-uploads directory');
  }

  console.log(`\n🗑️  Deleted ${deletedStudies.count} studies and all related data`);
}

// Run the script
main().catch(console.error);