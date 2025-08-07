#!/usr/bin/env node
/**
 * NANDA Adapter - Node.js Wrapper
 * 
 * This module provides a Node.js interface to the Python NANDA adapter,
 * allowing you to create agents using JavaScript while leveraging the 
 * robust Python core implementation.
 */

const { PythonBridge } = require('./bridge');
const { v4: uuidv4 } = require('uuid');
const chalk = require('chalk');

/**
 * NANDA class - Node.js wrapper for Python NANDA adapter
 */
class NANDA {
    constructor(improvementLogic, options = {}) {
        this.improvementLogic = improvementLogic;
        this.options = {
            pythonPath: options.pythonPath || 'python3',
            debug: options.debug || false,
            timeout: options.timeout || 30000,
            ...options
        };
        
        this.bridge = null;
        this.isRunning = false;
        this.agentId = options.agentId || `agent_${uuidv4().split('-')[0]}`;
        
        console.log(chalk.blue(`🤖 NANDA initialized with custom improvement logic: ${improvementLogic.name || 'anonymous'}`));
    }

    /**
     * Initialize the Python bridge and create the agent
     */
    async initialize() {
        if (this.bridge) {
            throw new Error('NANDA instance already initialized');
        }

        try {
            console.log(chalk.yellow('🔧 Initializing Python bridge...'));
            
            this.bridge = new PythonBridge(this.options);
            await this.bridge.start();
            
            // Register the improvement logic with Python
            await this._registerImprovementLogic();
            
            console.log(chalk.green('✅ NANDA initialized successfully'));
            return this;
        } catch (error) {
            console.error(chalk.red('❌ Failed to initialize NANDA:'), error.message);
            throw error;
        }
    }

    /**
     * Register the JavaScript improvement logic with the Python bridge
     */
    async _registerImprovementLogic() {
        const logicWrapper = {
            name: this.improvementLogic.name || 'nodejs_custom',
            function: this.improvementLogic.toString()
        };

        await this.bridge.executeCommand('register_improvement_logic', logicWrapper);
        console.log(chalk.cyan(`🔧 Custom improvement logic '${logicWrapper.name}' registered`));
    }

    /**
     * Start the agent server (basic mode)
     */
    async startServer() {
        if (!this.bridge) {
            await this.initialize();
        }

        try {
            console.log(chalk.blue('🚀 Starting NANDA agent server...'));
            
            const result = await this.bridge.executeCommand('start_server', {
                agent_id: this.agentId
            });
            
            this.isRunning = true;
            console.log(chalk.green('✅ Agent server started successfully'));
            return result;
        } catch (error) {
            console.error(chalk.red('❌ Failed to start server:'), error.message);
            throw error;
        }
    }

    /**
     * Start the agent API server with SSL support
     */
    async startServerAPI(config) {
        if (!config.anthropicKey) {
            throw new Error('anthropicKey is required');
        }
        if (!config.domain) {
            throw new Error('domain is required');
        }

        if (!this.bridge) {
            await this.initialize();
        }

        try {
            console.log(chalk.blue('🚀 Starting NANDA API server...'));
            
            const serverConfig = {
                anthropic_key: config.anthropicKey,
                domain: config.domain,
                agent_id: config.agentId || this.agentId,
                port: config.port || 6000,
                api_port: config.apiPort || 6001,
                registry: config.registry,
                public_url: config.publicUrl,
                api_url: config.apiUrl,
                cert: config.cert,
                key: config.key,
                ssl: config.ssl !== false // Default to true
            };

            const result = await this.bridge.executeCommand('start_server_api', serverConfig);
            
            this.isRunning = true;
            console.log(chalk.green('✅ API server started successfully'));
            
            if (result.enrollment_link) {
                console.log(chalk.magenta('🔗 Agent enrollment link:'));
                console.log(chalk.underline(result.enrollment_link));
            }
            
            return result;
        } catch (error) {
            console.error(chalk.red('❌ Failed to start API server:'), error.message);
            throw error;
        }
    }

    /**
     * Test the improvement logic with a sample message
     */
    async testImprovement(message) {
        if (!this.bridge) {
            await this.initialize();
        }

        try {
            const result = await this.bridge.executeCommand('test_improvement', {
                message: message
            });
            
            console.log(chalk.cyan('📝 Original message:'), message);
            console.log(chalk.cyan('📝 Improved message:'), result.improved_message);
            
            return result.improved_message;
        } catch (error) {
            console.error(chalk.red('❌ Failed to test improvement:'), error.message);
            throw error;
        }
    }

    /**
     * Stop the agent server and cleanup
     */
    async stop() {
        if (this.bridge && this.isRunning) {
            try {
                await this.bridge.executeCommand('stop_server');
                this.isRunning = false;
                console.log(chalk.yellow('🛑 Agent server stopped'));
            } catch (error) {
                console.warn(chalk.yellow('⚠️ Warning during server stop:'), error.message);
            }
        }

        if (this.bridge) {
            await this.bridge.stop();
            this.bridge = null;
            console.log(chalk.yellow('🔌 Python bridge disconnected'));
        }
    }

    /**
     * Get agent status and information
     */
    async getStatus() {
        if (!this.bridge) {
            return { initialized: false, running: false };
        }

        try {
            const status = await this.bridge.executeCommand('get_status');
            return {
                initialized: true,
                running: this.isRunning,
                agent_id: this.agentId,
                ...status
            };
        } catch (error) {
            return {
                initialized: true,
                running: false,
                error: error.message
            };
        }
    }
}

/**
 * Helper functions for common agent patterns
 */

/**
 * Create a simple text transformation improvement function
 */
function createTextTransformImprovement(transformFn) {
    return function textTransformImprovement(messageText) {
        try {
            return transformFn(messageText);
        } catch (error) {
            console.error('Error in text transformation:', error);
            return messageText; // Fallback to original
        }
    };
}

/**
 * Create an async improvement function (for API calls, etc.)
 */
function createAsyncImprovement(asyncFn) {
    return function asyncImprovement(messageText) {
        // Note: Python bridge will handle async execution
        return asyncFn(messageText);
    };
}

/**
 * Create a template-based improvement function
 */
function createTemplateImprovement(template) {
    return function templateImprovement(messageText) {
        return template.replace('{message}', messageText);
    };
}

module.exports = {
    NANDA,
    createTextTransformImprovement,
    createAsyncImprovement,
    createTemplateImprovement
};