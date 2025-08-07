/**
 * Python Bridge - Manages communication with Python NANDA core
 */

const { spawn } = require('cross-spawn');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const chalk = require('chalk');

class PythonBridge {
    constructor(options = {}) {
        this.options = {
            pythonPath: options.pythonPath || this._detectBestPython(),
            debug: options.debug || false,
            timeout: options.timeout || 30000,
            ...options
        };
        
        this.process = null;
        this.isRunning = false;
        this.messageQueue = new Map();
        this.eventHandlers = new Map();
        
        // Path to the Python wrapper script
        this.pythonScriptPath = path.join(__dirname, '..', 'python', 'bridge_wrapper.py');
    }

    /**
     * Start the Python bridge process
     */
    async start() {
        if (this.isRunning) {
            throw new Error('Bridge is already running');
        }

        try {
            // Check if Python wrapper exists
            if (!fs.existsSync(this.pythonScriptPath)) {
                throw new Error(`Python wrapper not found at ${this.pythonScriptPath}`);
            }
            
            // Start Python process
            this.process = spawn(this.options.pythonPath, [this.pythonScriptPath], {
                stdio: ['pipe', 'pipe', 'pipe'],
                env: { ...process.env, PYTHONUNBUFFERED: '1' }
            });

            // Set up process handlers
            this._setupProcessHandlers();
            
            // Wait for initialization
            await this._waitForReady();
            
            this.isRunning = true;
            
            if (this.options.debug) {
                console.log(chalk.cyan('🔧 Python bridge started successfully'));
            }
            
        } catch (error) {
            throw new Error(`Failed to start Python bridge: ${error.message}`);
        }
    }

    /**
     * Execute a command in the Python process
     */
    async executeCommand(command, data = {}) {
        if (!this.isRunning) {
            throw new Error('Bridge is not running');
        }

        const messageId = uuidv4();
        const message = {
            id: messageId,
            command: command,
            data: data,
            timestamp: new Date().toISOString()
        };

        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.messageQueue.delete(messageId);
                reject(new Error(`Command timeout: ${command}`));
            }, this.options.timeout);

            this.messageQueue.set(messageId, { resolve, reject, timer });

            try {
                this.process.stdin.write(JSON.stringify(message) + '\n');
                
                if (this.options.debug) {
                    console.log(chalk.gray(`📤 Sent command: ${command}`));
                }
            } catch (error) {
                clearTimeout(timer);
                this.messageQueue.delete(messageId);
                reject(error);
            }
        });
    }

    /**
     * Stop the Python bridge process
     */
    async stop() {
        if (!this.isRunning) {
            return;
        }

        try {
            // Send shutdown command
            if (this.process && !this.process.killed) {
                await this.executeCommand('shutdown').catch(() => {
                    // Ignore errors during shutdown
                });
            }
        } catch (error) {
            // Ignore shutdown errors
        }

        // Force kill if still running
        if (this.process && !this.process.killed) {
            this.process.kill('SIGTERM');
            
            // Give it time to exit gracefully
            setTimeout(() => {
                if (this.process && !this.process.killed) {
                    this.process.kill('SIGKILL');
                }
            }, 5000);
        }

        this.isRunning = false;
        this.process = null;
        
        // Clear pending messages
        for (const [id, { reject, timer }] of this.messageQueue.entries()) {
            clearTimeout(timer);
            reject(new Error('Bridge stopped'));
        }
        this.messageQueue.clear();
    }

    /**
     * Set up process event handlers
     */
    _setupProcessHandlers() {
        // Handle stdout (responses from Python)
        this.process.stdout.on('data', (data) => {
            const lines = data.toString().split('\n').filter(line => line.trim());
            
            for (const line of lines) {
                try {
                    const response = JSON.parse(line);
                    this._handlePythonResponse(response);
                } catch (error) {
                    // Log non-JSON Python output (like debug messages)
                    if (this.options.debug || line.includes('🐍') || line.includes('📁') || line.includes('✅') || line.includes('❌')) {
                        console.log(chalk.gray(`📥 Python output: ${line}`));
                    }
                }
            }
        });

        // Handle stderr (Python errors and debug output)
        this.process.stderr.on('data', (data) => {
            const message = data.toString().trim();
            if (this.options.debug || message.includes('ERROR') || message.includes('Exception') || message.includes('Python Bridge') || message.includes('🐍') || message.includes('📁')) {
                console.error(chalk.cyan('🐍 Python:'), message);
            }
        });

        // Handle process exit
        this.process.on('exit', (code, signal) => {
            this.isRunning = false;
            
            if (code !== 0) {
                console.error(chalk.red(`🐍 Python process exited with code ${code}, signal ${signal}`));
            }
            
            // Reject all pending messages
            for (const [id, { reject, timer }] of this.messageQueue.entries()) {
                clearTimeout(timer);
                reject(new Error(`Python process exited with code ${code}`));
            }
            this.messageQueue.clear();
        });

        // Handle errors
        this.process.on('error', (error) => {
            console.error(chalk.red('🐍 Python process error:'), error.message);
            this.isRunning = false;
        });
    }

    /**
     * Handle responses from Python process
     */
    _handlePythonResponse(response) {
        if (this.options.debug) {
            console.log(chalk.gray(`📥 Received response: ${response.type || response.status}`));
        }

        // Handle command responses
        if (response.id && this.messageQueue.has(response.id)) {
            const { resolve, reject, timer } = this.messageQueue.get(response.id);
            clearTimeout(timer);
            this.messageQueue.delete(response.id);

            if (response.status === 'success') {
                resolve(response.result || response);
            } else {
                reject(new Error(response.error || 'Unknown error'));
            }
            return;
        }

        // Handle events/notifications
        if (response.type === 'event') {
            this._handleEvent(response);
            return;
        }

        // Handle ready signal
        if (response.type === 'ready') {
            this._handleReady();
            return;
        }
    }

    /**
     * Handle events from Python
     */
    _handleEvent(event) {
        const handlers = this.eventHandlers.get(event.name) || [];
        for (const handler of handlers) {
            try {
                handler(event.data);
            } catch (error) {
                console.error(chalk.red('Event handler error:'), error);
            }
        }
    }

    /**
     * Wait for Python process to be ready
     */
    async _waitForReady() {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error('Python bridge initialization timeout'));
            }, this.options.timeout);

            this._readyResolve = () => {
                clearTimeout(timer);
                resolve();
            };
        });
    }

    /**
     * Handle ready signal from Python
     */
    _handleReady() {
        if (this._readyResolve) {
            this._readyResolve();
            this._readyResolve = null;
        }
    }

    /**
     * Add event listener
     */
    on(eventName, handler) {
        if (!this.eventHandlers.has(eventName)) {
            this.eventHandlers.set(eventName, []);
        }
        this.eventHandlers.get(eventName).push(handler);
    }

    /**
     * Remove event listener
     */
    off(eventName, handler) {
        const handlers = this.eventHandlers.get(eventName);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index !== -1) {
                handlers.splice(index, 1);
            }
        }
    }

    /**
     * Detect Python 3.11 and get its full path
     */
    _detectBestPython() {
        const { execSync } = require('child_process');
        const fs = require('fs');
        
        // Common Python 3.11 installation paths (check filesystem first)
        const python311Paths = [
            '/usr/bin/python3.11',      // Standard Amazon Linux location
            '/usr/local/bin/python3.11', // Local installation
            '/opt/python311/bin/python3.11' // Custom installation
        ];
        
        // First, check direct filesystem paths
        for (const pythonPath of python311Paths) {
            try {
                if (fs.existsSync(pythonPath)) {
                    // Verify it's actually Python 3.11
                    const version = execSync(`${pythonPath} --version`, { 
                        encoding: 'utf8', 
                        stdio: ['ignore', 'pipe', 'ignore'],
                        timeout: 5000
                    }).trim();
                    
                    if (version.includes('3.11')) {
                        console.log(`✅ Found Python 3.11 at: ${pythonPath} (${version})`);
                        return pythonPath;
                    }
                }
            } catch (error) {
                continue;
            }
        }
        
        // Fallback: try 'which' command
        try {
            const pythonPath = execSync('which python3.11', { 
                encoding: 'utf8', 
                stdio: ['ignore', 'pipe', 'ignore'],
                timeout: 5000
            }).trim();
            
            if (pythonPath) {
                console.log(`✅ Found Python 3.11 via which: ${pythonPath}`);
                return pythonPath;
            }
        } catch (error) {
            console.log('⚠️ python3.11 not found via which, trying alternatives...');
        }
        
        // Fallback to other Python versions
        const fallbacks = ['python3.12', 'python3.10', 'python3', 'python'];
        
        for (const pythonCmd of fallbacks) {
            try {
                const pythonPath = execSync(`which ${pythonCmd}`, { 
                    encoding: 'utf8', 
                    stdio: ['ignore', 'pipe', 'ignore'],
                    timeout: 5000
                }).trim();
                
                if (pythonPath) {
                    console.log(`⚠️ Using fallback Python at: ${pythonPath}`);
                    return pythonPath;
                }
            } catch (error) {
                continue;
            }
        }
        
        // Final fallback
        console.log('❌ No Python found, defaulting to python3');
        return 'python3';
    }

}

module.exports = { PythonBridge };