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
            pythonPath: options.pythonPath || 'python3.11',
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
            // Ensure Python wrapper exists
            await this._ensurePythonWrapper();
            
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
                    if (this.options.debug) {
                        console.log(chalk.gray(`📥 Python output: ${line}`));
                    }
                }
            }
        });

        // Handle stderr (Python errors and debug output)
        this.process.stderr.on('data', (data) => {
            const message = data.toString().trim();
            if (this.options.debug || message.includes('ERROR') || message.includes('Exception')) {
                console.error(chalk.red('🐍 Python error:'), message);
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
     * Ensure Python wrapper script exists
     */
    async _ensurePythonWrapper() {
        const pythonDir = path.dirname(this.pythonScriptPath);
        
        // Create python directory if it doesn't exist
        if (!fs.existsSync(pythonDir)) {
            fs.mkdirSync(pythonDir, { recursive: true });
        }

        // Create wrapper script if it doesn't exist
        if (!fs.existsSync(this.pythonScriptPath)) {
            await this._createPythonWrapper();
        }
    }

    /**
     * Create the Python wrapper script
     */
    async _createPythonWrapper() {
        const wrapperCode = `#!/usr/bin/env python3
"""
NANDA Bridge Wrapper - Node.js to Python communication bridge
"""

import sys
import os
import json
import traceback
import threading
import time
from io import StringIO

# Add the parent nanda_adapter directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
python_dir = os.path.join(parent_dir, 'python')
sys.path.insert(0, python_dir)

# Print Python version for debugging
print(f"🐍 Python Bridge starting with Python {sys.version}", file=sys.stderr, flush=True)
print(f"📁 Python path: {python_dir}", file=sys.stderr, flush=True)

try:
    from nanda_adapter import NANDA
    from nanda_adapter.core import AgentBridge
except ImportError as e:
    print(f"Error importing NANDA: {e}", file=sys.stderr)
    sys.exit(1)

class NodeJSBridge:
    """Bridge between Node.js and Python NANDA"""
    
    def __init__(self):
        self.nanda_instance = None
        self.improvement_logic = None
        self.server_thread = None
        self.running = False
        
        # Send ready signal
        self.send_response({
            'type': 'ready',
            'message': 'Python bridge initialized'
        })
    
    def send_response(self, data):
        """Send response back to Node.js"""
        try:
            response = json.dumps(data)
            print(response, flush=True)
        except Exception as e:
            print(json.dumps({
                'type': 'error',
                'error': str(e)
            }), flush=True)
    
    def send_event(self, event_name, event_data):
        """Send event to Node.js"""
        self.send_response({
            'type': 'event',
            'name': event_name,
            'data': event_data
        })
    
    def register_improvement_logic(self, logic_data):
        """Register JavaScript improvement logic"""
        try:
            logic_name = logic_data.get('name', 'nodejs_custom')
            logic_function_str = logic_data.get('function', '')
            
            # Create a wrapper function that can call the JS logic
            def improvement_wrapper(message_text):
                try:
                    # For now, we'll use a simple text transformation
                    # In a full implementation, this would evaluate the JS function
                    # or use a JS engine like PyV8 or similar
                    
                    # Simple fallback logic for demo
                    if 'pirate' in logic_name.lower():
                        return message_text.replace('hello', 'ahoy').replace('Hi', 'Ahoy')
                    elif 'professional' in logic_name.lower():
                        return f"Dear colleague, {message_text}. Best regards."
                    else:
                        # Default improvement
                        return message_text.strip().capitalize()
                        
                except Exception as e:
                    print(f"Error in improvement logic: {e}", file=sys.stderr)
                    return message_text
            
            self.improvement_logic = improvement_wrapper
            return {'status': 'success', 'message': f'Registered improvement logic: {logic_name}'}
            
        except Exception as e:
            return {'status': 'error', 'error': str(e)}
    
    def create_nanda_instance(self, agent_id=None):
        """Create NANDA instance with registered improvement logic"""
        try:
            if not self.improvement_logic:
                # Default improvement logic
                def default_logic(message_text):
                    return message_text.strip().capitalize()
                self.improvement_logic = default_logic
            
            self.nanda_instance = NANDA(self.improvement_logic)
            return {'status': 'success', 'message': 'NANDA instance created'}
            
        except Exception as e:
            return {'status': 'error', 'error': str(e)}
    
    def start_server(self, config):
        """Start NANDA server"""
        try:
            if not self.nanda_instance:
                result = self.create_nanda_instance()
                if result['status'] != 'success':
                    return result
            
            def run_server():
                try:
                    self.nanda_instance.start_server()
                except Exception as e:
                    self.send_event('server_error', {'error': str(e)})
            
            self.server_thread = threading.Thread(target=run_server, daemon=True)
            self.server_thread.start()
            self.running = True
            
            return {'status': 'success', 'message': 'Server started'}
            
        except Exception as e:
            return {'status': 'error', 'error': str(e)}
    
    def start_server_api(self, config):
        """Start NANDA API server"""
        try:
            if not self.nanda_instance:
                result = self.create_nanda_instance()
                if result['status'] != 'success':
                    return result
            
            def run_api_server():
                try:
                    self.nanda_instance.start_server_api(
                        anthropic_key=config['anthropic_key'],
                        domain=config['domain'],
                        agent_id=config.get('agent_id'),
                        port=config.get('port', 6000),
                        api_port=config.get('api_port', 6001),
                        registry=config.get('registry'),
                        public_url=config.get('public_url'),
                        api_url=config.get('api_url'),
                        cert=config.get('cert'),
                        key=config.get('key'),
                        ssl=config.get('ssl', True)
                    )
                except Exception as e:
                    self.send_event('server_error', {'error': str(e)})
            
            self.server_thread = threading.Thread(target=run_api_server, daemon=True)
            self.server_thread.start()
            self.running = True
            
            # Generate enrollment link
            agent_id = config.get('agent_id', 'default')
            enrollment_link = f"https://chat.nanda-registry.com/landing.html?agentId={agent_id}"
            
            return {
                'status': 'success', 
                'message': 'API server started',
                'enrollment_link': enrollment_link
            }
            
        except Exception as e:
            return {'status': 'error', 'error': str(e)}
    
    def test_improvement(self, data):
        """Test the improvement logic"""
        try:
            message = data.get('message', '')
            
            if not self.improvement_logic:
                return {'status': 'error', 'error': 'No improvement logic registered'}
            
            improved = self.improvement_logic(message)
            
            return {
                'status': 'success',
                'improved_message': improved
            }
            
        except Exception as e:
            return {'status': 'error', 'error': str(e)}
    
    def get_status(self):
        """Get bridge status"""
        return {
            'status': 'success',
            'bridge_running': True,
            'nanda_initialized': self.nanda_instance is not None,
            'server_running': self.running,
            'improvement_logic_registered': self.improvement_logic is not None
        }
    
    def stop_server(self):
        """Stop the server"""
        try:
            self.running = False
            if self.server_thread:
                # Note: In a full implementation, you'd need proper server shutdown
                pass
            return {'status': 'success', 'message': 'Server stopped'}
        except Exception as e:
            return {'status': 'error', 'error': str(e)}
    
    def shutdown(self):
        """Shutdown the bridge"""
        try:
            self.stop_server()
            return {'status': 'success', 'message': 'Bridge shutdown'}
        except Exception as e:
            return {'status': 'error', 'error': str(e)}
    
    def handle_command(self, message):
        """Handle command from Node.js"""
        try:
            command = message.get('command')
            data = message.get('data', {})
            message_id = message.get('id')
            
            # Route commands to appropriate handlers
            if command == 'register_improvement_logic':
                result = self.register_improvement_logic(data)
            elif command == 'start_server':
                result = self.start_server(data)
            elif command == 'start_server_api':
                result = self.start_server_api(data)
            elif command == 'test_improvement':
                result = self.test_improvement(data)
            elif command == 'get_status':
                result = self.get_status()
            elif command == 'stop_server':
                result = self.stop_server()
            elif command == 'shutdown':
                result = self.shutdown()
                self.send_response({
                    'id': message_id,
                    'status': result['status'],
                    'result': result
                })
                sys.exit(0)
            else:
                result = {'status': 'error', 'error': f'Unknown command: {command}'}
            
            # Send response with message ID
            self.send_response({
                'id': message_id,
                'status': result['status'],
                'result': result.get('message') or result,
                'error': result.get('error')
            })
            
        except Exception as e:
            self.send_response({
                'id': message.get('id'),
                'status': 'error',
                'error': str(e),
                'traceback': traceback.format_exc()
            })

def main():
    """Main bridge loop"""
    bridge = NodeJSBridge()
    
    try:
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
                
            try:
                message = json.loads(line)
                bridge.handle_command(message)
            except json.JSONDecodeError:
                bridge.send_response({
                    'status': 'error',
                    'error': 'Invalid JSON message'
                })
            except Exception as e:
                bridge.send_response({
                    'status': 'error',
                    'error': str(e),
                    'traceback': traceback.format_exc()
                })
                
    except KeyboardInterrupt:
        pass
    except Exception as e:
        print(f"Bridge error: {e}", file=sys.stderr)

if __name__ == '__main__':
    main()
`;

        fs.writeFileSync(this.pythonScriptPath, wrapperCode, 'utf8');
        fs.chmodSync(this.pythonScriptPath, '755'); // Make executable
    }
}

module.exports = { PythonBridge };