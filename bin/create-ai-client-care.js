#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function log(message, type = 'info') {
  const icons = {
    info: '📝',
    success: '✅',
    warning: '⚠️',
    error: '❌',
    progress: '🔄'
  };
  console.log(`${icons[type]} ${message}`);
}

function createAICustomerCareProject() {
  const projectName = process.argv[2];

  if (!projectName) {
    log('Please specify the project directory: npx tinadmin-ai-client-care-template <project-name>', 'error');
    process.exit(1);
  }

  const projectPath = path.resolve(process.cwd(), projectName);
  const templateDir = path.dirname(__dirname); // This points to the template directory

  log(`🚀 Creating new AI Client Care project: ${projectName}`, 'progress');

  try {
    // Create project directory
    fs.mkdirSync(projectPath, { recursive: true });

    log('📁 Copying template files...', 'progress');

    // Copy all template files except node_modules, .git, and this bin directory
    const itemsToCopy = fs.readdirSync(templateDir);

    for (const item of itemsToCopy) {
      const srcPath = path.join(templateDir, item);
      const destPath = path.join(projectPath, item);

      // Skip certain directories and files
      if (['node_modules', '.git', 'bin', '.next', 'dist', projectName].includes(item)) {
        continue;
      }

      // Skip if source and destination are the same (avoid circular copying)
      if (path.resolve(srcPath) === path.resolve(destPath)) {
        continue;
      }

      if (fs.statSync(srcPath).isDirectory()) {
        fs.cpSync(srcPath, destPath, { recursive: true });
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }

    // Update package.json with the new project name
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      packageJson.name = projectName;
      packageJson.description = `${projectName} - AI Client Care platform for managing voice agents and chat conversations`;
      packageJson.private = true;

      // Remove template-specific fields
      delete packageJson.bin;
      delete packageJson.files;
      delete packageJson.homepage;
      delete packageJson.repository;
      delete packageJson.bugs;
      delete packageJson.publishConfig;
      delete packageJson.keywords;
      delete packageJson.author;
      delete packageJson.license;

      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    }

    console.log('✅ Project created successfully!');
    console.log('');
    console.log('📋 Next steps:');
    console.log(`   cd ${projectName}`);
    console.log('   npm install');
    console.log('   npm run dev');
    console.log('');
    console.log('🌐 Open http://localhost:3000 to view your AI Client Care application');
    console.log('');
    console.log('📚 Documentation:');
    console.log('   - README.md - Getting started guide');
    console.log('   - DEPLOYMENT.md - Deployment instructions');

  } catch (error) {
    log(`❌ Failed to create project: ${error.message}`, 'error');
    process.exit(1);
  }
}

if (require.main === module) {
  createAICustomerCareProject();
}