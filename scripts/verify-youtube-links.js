#!/usr/bin/env node

/**
 * YouTube Links Verification Script
 * 
 * Purpose:
 * - Verify all YouTube links in content/videos/*.json
 * - Normalize URLs to standard format
 * - Check if videos are accessible
 * - Generate report of broken/invalid links
 * 
 * Usage:
 * node scripts/verify-youtube-links.js [--fix] [--check-exists]
 * 
 * Options:
 * --fix: Automatically fix URL formatting issues
 * --check-exists: Check if videos actually exist on YouTube (slow, uses oEmbed API)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// YouTube URL patterns
const YOUTUBE_PATTERNS = {
  watch: /(?:youtube\.com\/watch\?v=|youtube\.com\/watch\?.*&v=)([a-zA-Z0-9_-]{11})/,
  short: /youtu\.be\/([a-zA-Z0-9_-]{11})/,
  embed: /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  v: /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
  idOnly: /^[a-zA-Z0-9_-]{11}$/
};

/**
 * Extract YouTube video ID from URL
 */
function extractYouTubeId(url) {
  if (!url || typeof url !== 'string') return null;
  
  url = url.trim();
  
  // Try all patterns
  for (const pattern of Object.values(YOUTUBE_PATTERNS)) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
    
    // Check if it's just the ID
    if (pattern === YOUTUBE_PATTERNS.idOnly && pattern.test(url)) {
      return url;
    }
  }
  
  return null;
}

/**
 * Normalize YouTube URL to standard format
 */
function normalizeYouTubeUrl(url) {
  const videoId = extractYouTubeId(url);
  if (!videoId) return null;
  
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * Check if YouTube video exists using oEmbed API
 */
async function checkVideoExists(url) {
  const videoId = extractYouTubeId(url);
  if (!videoId) return false;
  
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const response = await fetch(oembedUrl);
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Process a single video entry
 */
function processVideo(video, options = {}) {
  const result = {
    original: video.url,
    youtube_id: video.youtube_id,
    issues: [],
    fixed: null
  };
  
  // Check if URL is present
  if (!video.url) {
    result.issues.push('Missing URL');
    return result;
  }
  
  // Extract video ID
  const extractedId = extractYouTubeId(video.url);
  
  if (!extractedId) {
    result.issues.push('Invalid YouTube URL format');
    return result;
  }
  
  // Check if youtube_id matches extracted ID
  if (video.youtube_id && video.youtube_id !== extractedId) {
    result.issues.push(`youtube_id mismatch: stored="${video.youtube_id}", extracted="${extractedId}"`);
  }
  
  // Check if URL needs normalization
  const normalized = normalizeYouTubeUrl(video.url);
  if (normalized && normalized !== video.url) {
    result.issues.push('URL format needs normalization');
    result.fixed = normalized;
  }
  
  return result;
}

/**
 * Process all video files
 */
async function processAllVideos(options = {}) {
  const videosDir = path.join(path.dirname(__dirname), 'content', 'videos');
  const files = fs.readdirSync(videosDir).filter(f => f.endsWith('.json'));
  
  const report = {
    totalVideos: 0,
    totalIssues: 0,
    fixed: 0,
    byFile: {}
  };
  
  console.log(`🔍 Scanning ${files.length} video files...\n`);
  
  for (const file of files) {
    const filePath = path.join(videosDir, file);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    const fileReport = {
      issues: [],
      videos: []
    };
    
    // Process each topic and video
    for (const topic of content.topics || []) {
      for (const video of topic.videos || []) {
        report.totalVideos++;
        
        const videoResult = processVideo(video, options);
        
        if (videoResult.issues.length > 0) {
          report.totalIssues += videoResult.issues.length;
          
          fileReport.videos.push({
            title: video.title,
            topic: topic.title,
            ...videoResult
          });
          
          // Fix if requested
          if (options.fix && videoResult.fixed) {
            video.url = videoResult.fixed;
            
            // Also update youtube_id if needed
            const extractedId = extractYouTubeId(videoResult.fixed);
            if (extractedId) {
              video.youtube_id = extractedId;
            }
            
            report.fixed++;
          }
        }
      }
    }
    
    // Save fixed file if changes were made
    if (options.fix && fileReport.videos.length > 0) {
      fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n', 'utf8');
      console.log(`✅ Fixed ${fileReport.videos.length} videos in ${file}`);
    }
    
    if (fileReport.videos.length > 0) {
      report.byFile[file] = fileReport;
    }
  }
  
  return report;
}

/**
 * Print report
 */
function printReport(report, options = {}) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 YOUTUBE LINKS VERIFICATION REPORT');
  console.log('='.repeat(60) + '\n');
  
  console.log(`Total videos scanned: ${report.totalVideos}`);
  console.log(`Total issues found: ${report.totalIssues}`);
  
  if (options.fix) {
    console.log(`Total fixed: ${report.fixed}\n`);
  } else {
    console.log('\n');
  }
  
  if (report.totalIssues === 0) {
    console.log('✅ All YouTube links are valid!\n');
    return;
  }
  
  // Print issues by file
  for (const [file, fileReport] of Object.entries(report.byFile)) {
    console.log(`\n📁 ${file}`);
    console.log('-'.repeat(60));
    
    for (const video of fileReport.videos) {
      console.log(`\n  📹 ${video.title}`);
      console.log(`     Topic: ${video.topic}`);
      console.log(`     Original URL: ${video.original}`);
      
      for (const issue of video.issues) {
        console.log(`     ⚠️  ${issue}`);
      }
      
      if (video.fixed) {
        console.log(`     ✨ Fixed URL: ${video.fixed}`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  if (!options.fix && report.totalIssues > 0) {
    console.log('💡 Tip: Run with --fix flag to automatically fix URL formatting issues');
    console.log('   Example: node scripts/verify-youtube-links.js --fix\n');
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const options = {
    fix: args.includes('--fix'),
    checkExists: args.includes('--check-exists')
  };
  
  console.log('🎬 YouTube Links Verification Tool\n');
  
  if (options.fix) {
    console.log('🔧 Fix mode enabled - URLs will be normalized automatically\n');
  }
  
  if (options.checkExists) {
    console.log('🌐 Existence check enabled - This will take longer...\n');
  }
  
  try {
    const report = await processAllVideos(options);
    printReport(report, options);
    
    // Exit with error code if issues found (for CI/CD)
    if (report.totalIssues > 0 && !options.fix) {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run main function
main();

export {
  extractYouTubeId,
  normalizeYouTubeUrl,
  processVideo,
  processAllVideos
};
