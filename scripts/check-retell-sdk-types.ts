/**
 * Check Retell SDK TypeScript Definitions
 * 
 * This script inspects the Retell SDK TypeScript types to determine:
 * 1. What types are exported for LLM operations
 * 2. What fields are defined in LLMUpdateParams (if available)
 * 3. What fields are defined in LLMCreateParams (if available)
 * 
 * Usage:
 *   tsx scripts/check-retell-sdk-types.ts
 */

import Retell from 'retell-sdk';
import * as fs from 'fs';
import * as path from 'path';

async function checkRetellSDKTypes() {
  console.log('🔍 Checking Retell SDK TypeScript Definitions');
  console.log('==============================================\n');

  try {
    // Try to import the SDK and inspect its structure
    console.log('📦 Inspecting Retell SDK exports...');
    const retellSDK = await import('retell-sdk');
    
    console.log('\n✅ Retell SDK imported successfully');
    console.log('\n📋 Available exports:');
    const exports = Object.keys(retellSDK);
    console.log(`   Total exports: ${exports.length}`);
    
    // Filter relevant exports
    const llmExports = exports.filter(e => 
      e.toLowerCase().includes('llm') || 
      e.toLowerCase().includes('update') ||
      e.toLowerCase().includes('create') ||
      e.toLowerCase().includes('type')
    );
    
    if (llmExports.length > 0) {
      console.log('\n🔍 LLM/Update related exports:');
      llmExports.forEach(exp => console.log(`   - ${exp}`));
    }

    // Check if we can access type definitions via the client
    console.log('\n📊 Inspecting Retell client structure...');
    const client = new Retell({ apiKey: 'test' });
    
    console.log('   Client type:', typeof client);
    console.log('   Has llm property:', 'llm' in client);
    
    if ('llm' in client) {
      const llm = (client as any).llm;
      console.log('   LLM methods:', Object.keys(llm || {}));
      
      if (llm && typeof llm.update === 'function') {
        console.log('   ✅ llm.update() method exists');
      }
      
      if (llm && typeof llm.retrieve === 'function') {
        console.log('   ✅ llm.retrieve() method exists');
      }
      
      if (llm && typeof llm.create === 'function') {
        console.log('   ✅ llm.create() method exists');
      }
    }

    // Try to find TypeScript definition files
    console.log('\n📁 Searching for TypeScript definition files...');
    const nodeModulesPath = path.join(process.cwd(), 'node_modules', 'retell-sdk');
    
    if (fs.existsSync(nodeModulesPath)) {
      console.log(`   ✅ Found retell-sdk at: ${nodeModulesPath}`);
      
      // Look for .d.ts files
      const findDefinitionFiles = (dir: string, depth = 0): string[] => {
        if (depth > 3) return []; // Limit depth
        
        const files: string[] = [];
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
              files.push(...findDefinitionFiles(fullPath, depth + 1));
            } else if (entry.isFile() && entry.name.endsWith('.d.ts')) {
              files.push(fullPath);
            }
          }
        } catch (error) {
          // Ignore errors
        }
        
        return files;
      };
      
      const definitionFiles = findDefinitionFiles(nodeModulesPath);
      
      if (definitionFiles.length > 0) {
        console.log(`   ✅ Found ${definitionFiles.length} definition files:`);
        definitionFiles.slice(0, 10).forEach(file => {
          const relativePath = path.relative(process.cwd(), file);
          console.log(`      - ${relativePath}`);
        });
        
        // Try to read and parse definition files for LLM types
        console.log('\n🔍 Searching for LLM type definitions...');
        for (const file of definitionFiles.slice(0, 5)) {
          try {
            const content = fs.readFileSync(file, 'utf-8');
            
            // Look for LLM-related type definitions
            if (content.includes('LLM') || content.includes('llm')) {
              console.log(`\n   📄 ${path.basename(file)}:`);
              
              // Extract type definitions (using [\s\S] instead of . with 's' flag for ES2017 compatibility)
              const updateMatch = content.match(/interface\s+LLMUpdateParams\s*\{([\s\S]+?)\}/);
              const createMatch = content.match(/interface\s+LLMCreateParams\s*\{([\s\S]+?)\}/);
              const typeMatch = content.match(/type\s+LLMUpdateParams\s*=\s*\{([\s\S]+?)\}/);
              
              if (updateMatch) {
                console.log('   ✅ Found LLMUpdateParams interface:');
                const fields = updateMatch[1]
                  .split('\n')
                  .map(line => line.trim())
                  .filter(line => line && !line.startsWith('/') && !line.startsWith('*'));
                fields.forEach(field => console.log(`      ${field}`));
              }
              
              if (createMatch) {
                console.log('   ✅ Found LLMCreateParams interface:');
                const fields = createMatch[1]
                  .split('\n')
                  .map(line => line.trim())
                  .filter(line => line && !line.startsWith('/') && !line.startsWith('*'));
                fields.forEach(field => console.log(`      ${field}`));
              }
              
              if (typeMatch) {
                console.log('   ✅ Found LLMUpdateParams type:');
                const fields = typeMatch[1]
                  .split('\n')
                  .map(line => line.trim())
                  .filter(line => line && !line.startsWith('/') && !line.startsWith('*'));
                fields.forEach(field => console.log(`      ${field}`));
              }
              
              // Look for model, temperature, max_tokens mentions
              const modelMatch = content.match(/model\s*[:?]\s*string/gi);
              const tempMatch = content.match(/temperature\s*[:?]\s*number/gi);
              const tokensMatch = content.match(/max[_\-]?tokens?\s*[:?]\s*number/gi);
              
              if (modelMatch || tempMatch || tokensMatch) {
                console.log('   📌 Found relevant fields:');
                if (modelMatch) console.log('      - model: string');
                if (tempMatch) console.log('      - temperature: number');
                if (tokensMatch) console.log('      - max_tokens/maxTokens: number');
              }
            }
          } catch (error) {
            // Ignore read errors
          }
        }
      } else {
        console.log('   ⚠️  No .d.ts files found');
      }
    } else {
      console.log(`   ⚠️  retell-sdk not found at: ${nodeModulesPath}`);
      console.log('   💡 Try running: npm install');
    }

    // Check package.json for type definitions
    console.log('\n📦 Checking package.json...');
    const packageJsonPath = path.join(nodeModulesPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      console.log(`   Package: ${packageJson.name}@${packageJson.version}`);
      if (packageJson.types) {
        console.log(`   Types entry: ${packageJson.types}`);
      }
      if (packageJson.typings) {
        console.log(`   Typings entry: ${packageJson.typings}`);
      }
    }

    console.log('\n✅ Type checking completed!\n');
    console.log('💡 Next steps:');
    console.log('   1. Run the test script: tsx scripts/test-retell-llm-update-fields.ts <agent_id>');
    console.log('   2. Check Retell API documentation: https://docs.retellai.com/api-references/update-retell-llm');
    console.log('   3. Inspect actual API responses from llm.retrieve() calls\n');

  } catch (error: any) {
    console.error('\n❌ Error checking types:');
    console.error(error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the check
checkRetellSDKTypes();

