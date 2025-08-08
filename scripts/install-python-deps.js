#!/usr/bin/env node
/**
 * Install Python Dependencies Script
 * 
 * This script ensures Python dependencies are installed when the Node.js package is installed
 */

const { spawn } = require('cross-spawn');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const PYTHON_DIR = path.join(__dirname, '..', 'python');
const REQUIREMENTS_FILE = path.join(PYTHON_DIR, 'requirements.txt');

async function checkPython() {
    console.log(chalk.blue('🔍 Checking Python installation...'));
    
    const pythonCommands = ['python3.11'];
    
    for (const cmd of pythonCommands) {
        try {
            const result = await runCommand(cmd, ['--version']);
            if (result.success) {
                console.log(chalk.green(`✅ Found Python: ${cmd} - ${result.output.trim()}`));
                return cmd;
            }
        } catch (error) {
            // Continue to next command
        }
    }
    
    throw new Error('Python not found. Please install Python 3.8 or higher.');
}

async function checkPip(pythonCmd) {
    console.log(chalk.blue('🔍 Checking pip installation...'));
    
    try {
        const result = await runCommand(pythonCmd, ['-m', 'pip', '--version']);
        if (result.success) {
            console.log(chalk.green(`✅ Found pip: ${result.output.trim()}`));
            return true;
        }
    } catch (error) {
        throw new Error('pip not found. Please install pip for your Python installation.');
    }
}

async function installPythonDependencies(pythonCmd) {
    console.log(chalk.blue('📦 Installing Python dependencies...'));
    
    if (!fs.existsSync(REQUIREMENTS_FILE)) {
        console.log(chalk.yellow('⚠️ No requirements.txt found, skipping Python dependency installation'));
        return;
    }
    
    try {
        const result = await runCommand(pythonCmd, [
            '-m', 'pip', 'install', 
            '-r', REQUIREMENTS_FILE,
            '--user'  // Install to user directory to avoid permission issues
        ]);
        
        if (result.success) {
            console.log(chalk.green('✅ Python dependencies installed successfully'));
        } else {
            console.warn(chalk.yellow('⚠️ Some Python dependencies may not have installed correctly'));
            console.log(result.output);
        }
    } catch (error) {
        console.error(chalk.red('❌ Failed to install Python dependencies:'), error.message);
        console.log(chalk.yellow('💡 You may need to install dependencies manually:'));
        console.log(chalk.gray(`   ${pythonCmd} -m pip install -r requirements.txt`));
    }
}

async function copyPythonSource() {
    console.log(chalk.blue('📁 Setting up Python source files...'));
    
    const sourceDir = path.join(__dirname, '..', 'nanda_adapter');
    const targetDir = path.join(PYTHON_DIR, 'nanda_adapter');
    
    if (!fs.existsSync(sourceDir)) {
        console.warn(chalk.yellow('⚠️ Source nanda_adapter directory not found'));
        return;
    }
    
    try {
        // Create python directory if it doesn't exist
        if (!fs.existsSync(PYTHON_DIR)) {
            fs.mkdirSync(PYTHON_DIR, { recursive: true });
        }
        
        // Copy nanda_adapter directory
        copyDirectoryRecursive(sourceDir, targetDir);
        
        // requirements.txt is already in python directory, no need to copy
        
        console.log(chalk.green('✅ Python source files copied successfully'));
    } catch (error) {
        console.error(chalk.red('❌ Failed to copy Python source files:'), error.message);
        throw error;
    }
}

function copyDirectoryRecursive(src, dest) {
    if (!fs.existsSync(src)) {
        return;
    }
    
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    
    const entries = fs.readdirSync(src, { withFileTypes: true });
    
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        if (entry.isDirectory()) {
            copyDirectoryRecursive(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

async function runCommand(command, args = []) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        let output = '';
        let errorOutput = '';
        
        child.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        child.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });
        
        child.on('close', (code) => {
            if (code === 0) {
                resolve({ success: true, output, error: errorOutput });
            } else {
                reject(new Error(`Command failed with code ${code}: ${errorOutput || output}`));
            }
        });
        
        child.on('error', (error) => {
            reject(error);
        });
    });
}

async function main() {
    console.log(chalk.bold.blue('🚀 NANDA Node.js Wrapper - Python Dependencies Setup\n'));
    
    try {
        // Check if we're in a CI environment
        const isCI = process.env.CI || process.env.CONTINUOUS_INTEGRATION;
        if (isCI) {
            console.log(chalk.yellow('ℹ️ CI environment detected, skipping Python setup'));
            return;
        }
        
        // Copy Python source files
        await copyPythonSource();
        
        // Check Python installation
        const pythonCmd = await checkPython();
        
        // Check pip installation
        await checkPip(pythonCmd);
        
        // Install dependencies
        await installPythonDependencies(pythonCmd);
        
        console.log(chalk.bold.green('\n🎉 Setup completed successfully!'));
        console.log(chalk.gray('You can now use nanda-adapter-js in your Node.js projects.'));
        
    } catch (error) {
        console.error(chalk.bold.red('\n❌ Setup failed:'), error.message);
        console.log(chalk.yellow('\n💡 Manual setup instructions:'));
        console.log(chalk.gray('1. Make sure Python 3.8+ is installed'));
        console.log(chalk.gray('2. Install pip if not already installed'));
        console.log(chalk.gray('3. Run: python3 -m pip install -r requirements.txt'));
        process.exit(1);
    }
}

// Only run if called directly
if (require.main === module) {
    main().catch(error => {
        console.error(error);
        process.exit(1);
    });
}

module.exports = { main, checkPython, installPythonDependencies };