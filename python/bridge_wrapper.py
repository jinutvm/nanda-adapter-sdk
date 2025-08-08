#!/usr/bin/env python3
"""
NANDA Bridge Wrapper - Node.js to Python communication bridge
"""

import sys
import os
import json
import traceback
import threading
import logging
import signal
import subprocess
import tempfile

# Add the parent nanda_adapter directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
python_dir = os.path.join(parent_dir, 'python')
sys.path.insert(0, parent_dir)

# Configure logging to stderr to capture NANDA core logs
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stderr,
    force=True
)

# Print Python version for debugging
print(f"🐍 Python Bridge starting with Python {sys.version}", file=sys.stderr, flush=True)
print(f"📁 Python path: {parent_dir}", file=sys.stderr, flush=True)

try:
    from nanda_adapter import NANDA
    print("✅ NANDA imported successfully", file=sys.stderr, flush=True)
except ImportError as e:
    print(f"❌ Error importing NANDA: {e}", file=sys.stderr, flush=True)
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
        """Register JavaScript improvement logic for execution"""
        try:
            logic_name = logic_data.get('name', 'nodejs_custom')
            logic_function_str = logic_data.get('function', '')
            
            print(f"🔧 Storing JavaScript improvement function: {logic_name}", file=sys.stderr, flush=True)
            
            # Store the function string and metadata
            self.js_function_str = logic_function_str
            self.js_function_name = logic_name
            
            # Create a wrapper that executes the JavaScript function via Node.js
            def improvement_wrapper(message_text):
                try:
                    print(f"🏴‍☠️ Executing {logic_name} for: '{message_text}'", file=sys.stderr, flush=True)
                    
                    # Create temporary Node.js script to execute the improvement function
                    js_wrapper = f'''
const {{ ChatAnthropic }} = require('@langchain/anthropic');
const {{ PromptTemplate }} = require('@langchain/core/prompts');
const {{ StringOutputParser }} = require('@langchain/core/output_parsers');

// The improvement function from the Node.js process
const improvementFunction = {logic_function_str};

// Execute the function
(async () => {{
    try {{
        const messageText = process.argv[2];
        const result = await improvementFunction(messageText);
        console.log(result);
    }} catch (error) {{
        console.error('Error:', error.message);
        // Return original message on error
        console.log(process.argv[2]);
    }}
}})();
'''
                    
                    # Write to temporary file
                    with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as temp_file:
                        temp_file.write(js_wrapper)
                        temp_js_path = temp_file.name
                    
                    try:
                        # Find the actual working directory where node_modules exists
                        # This should be where the user is running their Node.js app
                        working_dir = os.getcwd()
                        
                        # Set up environment for Node.js execution
                        env = os.environ.copy()
                        # Add multiple possible node_modules paths
                        node_paths = [
                            f"{working_dir}/node_modules",
                            f"{parent_dir}/node_modules",
                            f"{parent_dir}/../node_modules"
                        ]
                        env['NODE_PATH'] = ':'.join(node_paths) + ':' + env.get('NODE_PATH', '')
                        
                        print(f"🔧 Executing Node.js in: {working_dir}", file=sys.stderr, flush=True)
                        print(f"🔧 NODE_PATH: {env['NODE_PATH']}", file=sys.stderr, flush=True)
                        
                        # Execute the JavaScript improvement function
                        result = subprocess.run([
                            'node', temp_js_path, message_text
                        ], cwd=working_dir, env=env, capture_output=True, text=True, timeout=30)
                        
                        if result.returncode == 0:
                            improved_text = result.stdout.strip()
                            if improved_text and improved_text != message_text:
                                print(f"✅ JavaScript improvement result: '{improved_text}'", file=sys.stderr, flush=True)
                                return improved_text
                            else:
                                print(f"⚠️ JavaScript returned same text or empty", file=sys.stderr, flush=True)
                                return message_text
                        else:
                            print(f"❌ JavaScript execution failed: {result.stderr.strip()}", file=sys.stderr, flush=True)
                            return message_text
                            
                    finally:
                        # Clean up temp file
                        try:
                            os.unlink(temp_js_path)
                        except:
                            pass
                    
                except Exception as e:
                    print(f"❌ Error executing JavaScript improvement: {e}", file=sys.stderr, flush=True)
                    return message_text
            
            self.improvement_logic = improvement_wrapper
            return {'status': 'success', 'message': f'JavaScript improvement logic ready: {logic_name}'}
            
        except Exception as e:
            print(f"❌ Error registering improvement logic: {e}", file=sys.stderr, flush=True)
            return {'status': 'error', 'error': str(e)}
    
    def create_nanda_instance(self):
        """Create NANDA instance with registered improvement logic"""
        try:
            print("🔧 Creating NANDA instance...", file=sys.stderr, flush=True)
            if not self.improvement_logic:
                # Default improvement logic
                def default_logic(message_text):
                    return message_text.strip().capitalize()
                self.improvement_logic = default_logic
                print("📝 Using default improvement logic", file=sys.stderr, flush=True)
            
            self.nanda_instance = NANDA(self.improvement_logic)
            print("✅ NANDA instance created successfully", file=sys.stderr, flush=True)
            return {'status': 'success', 'message': 'NANDA instance created'}
            
        except Exception as e:
            print(f"❌ Error creating NANDA instance: {e}", file=sys.stderr, flush=True)
            return {'status': 'error', 'error': str(e)}
    
    def start_server(self):
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
            print("🚀 Starting NANDA API server...", file=sys.stderr, flush=True)
            if not self.nanda_instance:
                result = self.create_nanda_instance()
                if result['status'] != 'success':
                    return result
            
            def run_api_server():
                try:
                    print(f"🌐 Starting server with domain: {config['domain']}", file=sys.stderr, flush=True)
                    print(f"🔑 Using agent_id: {config.get('agent_id', 'default')}", file=sys.stderr, flush=True)
                    
                    # Temporarily redirect stdout to stderr to capture NANDA logs
                    original_stdout = sys.stdout
                    sys.stdout = sys.stderr
                    
                    # Patch signal handling to avoid "signal only works in main thread" error
                    original_signal = signal.signal
                    def dummy_signal(sig, handler):
                        print(f"⚠️ Skipping signal handler setup for {sig} (running in thread)", file=sys.stderr, flush=True)
                        return None
                    signal.signal = dummy_signal
                    
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
                    finally:
                        # Restore original signal and stdout
                        signal.signal = original_signal
                        sys.stdout = original_stdout
                        
                except Exception as e:
                    print(f"❌ Server error: {e}", file=sys.stderr, flush=True)
                    self.send_event('server_error', {'error': str(e)})
            
            self.server_thread = threading.Thread(target=run_api_server, daemon=True)
            self.server_thread.start()
            self.running = True
            
            # Note: agent_id generation and enrollment link creation is handled by NANDA core
            
            print("✅ API server thread started successfully", file=sys.stderr, flush=True)
            return {
                'status': 'success', 
                'message': 'API server started'
            }
            
        except Exception as e:
            print(f"❌ Error starting API server: {e}", file=sys.stderr, flush=True)
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
                'result': result,
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