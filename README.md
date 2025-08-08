# NANDA Adapter - Node.js Wrapper

Bring your local Node.js agent to the **persistent**, **discoverable** and **interoperable** global internet of agents with NANDA.

Build custom improvement logic using JavaScript/TypeScript with LangChain, custom functions, or any AI framework.

## Features

- **JavaScript/TypeScript Support**: Write improvement logic in familiar Node.js environment
- **LangChain Integration**: Built-in support for LangChain ChatAnthropic and other providers
- **Custom Logic**: Simple function-based improvement or complex AI workflows  
- **Multi-protocol Communication**: Universal agent-to-agent communication
- **Global Discovery**: Automatic agent registration in MIT NANDA Index
- **SSL Support**: Production-ready with Let's Encrypt certificates
- **Python Bridge**: Seamless integration with NANDA's Python core

## Installation

### Prerequisites

**Required:**
- **Node.js 16+** (recommended: Node.js 18+)
- **Python 3.11** (required for NANDA core)

**Optional:**
- **LangChain packages** (if using AI-powered improvements)
- **Domain name** (for production SSL setup)

### Install Package

```bash
npm install nanda-adapter-js
```

The install script automatically:
- Checks for Python 3.11 installation
- Installs Python dependencies from `python/requirements.txt`
- Sets up the Python bridge

## How to Create Your Pirate Agent

This example shows how to create a LangChain-powered pirate agent that transforms messages into pirate English.

### 1. Create package.json

```json
{
  "name": "pirate-agent",
  "version": "1.0.0",
  "description": "LangChain-powered Pirate Agent using NANDA",
  "main": "pirate-agent.js",
  "scripts": {
    "start": "node pirate-agent.js",
    "dev": "DEBUG=true node pirate-agent.js"
  },
  "dependencies": {
    "nanda-adapter-js": "^1.0.0",
    "@langchain/anthropic": "^0.2.0",
    "@langchain/core": "^0.2.0",
    "dotenv": "^16.0.0"
  },
  "engines": {
    "node": ">=16.0.0"
  }
}
```

### 2. Create pirate-agent.js

```javascript
#!/usr/bin/env node
/**
 * Pirate Agent - Transforms messages to pirate English using LangChain
 */
const { NANDA } = require('nanda-adapter-js');
require('dotenv').config();

function createPirateImprovement() {
    return async function(messageText) {
        try {
            // Import LangChain inside function to avoid scoping issues
            const { ChatAnthropic } = require('@langchain/anthropic');
            const { PromptTemplate } = require('@langchain/core/prompts');
            const { StringOutputParser } = require('@langchain/core/output_parsers');
            
            const llm = new ChatAnthropic({
                apiKey: process.env.ANTHROPIC_API_KEY,
                model: 'claude-3-haiku-20240307',
                temperature: 0.7
            });

            const piratePrompt = PromptTemplate.fromTemplate(`
Transform the following message into authentic pirate English:

Pirate transformations:
- "hello" → "ahoy"
- "friend" → "matey" 
- "you" → "ye"
- "yes" → "aye"

Add pirate expressions like "Arrr!", "Shiver me timbers!" when fitting.

Original: {message}
Pirate English:`);

            const chain = piratePrompt.pipe(llm).pipe(new StringOutputParser());
            
            // Add timeout protection
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Timeout')), 10000);
            });
            
            const llmPromise = chain.invoke({ message: messageText });
            const pirateMessage = await Promise.race([llmPromise, timeoutPromise]);
            
            return pirateMessage.trim() || messageText;
        } catch (error) {
            return messageText; // Fallback to original
        }
    };
}

async function main() {
    console.log('🏴‍☠️ Starting Pirate Agent...');

    if (!process.env.ANTHROPIC_API_KEY || !process.env.DOMAIN_NAME) {
        console.error('❌ ANTHROPIC_API_KEY and DOMAIN_NAME are required');
        process.exit(1);
    }

    const nanda = new NANDA(createPirateImprovement(), {
        debug: process.env.DEBUG === 'true'
    });

    const result = await nanda.startServerAPI({
        anthropicKey: process.env.ANTHROPIC_API_KEY,
        domain: process.env.DOMAIN_NAME,
        ssl: true,
        cert: './certs/fullchain.pem',
        key: './certs/privkey.pem'
    });

    console.log('✅ Pirate Agent is sailing! 🏴‍☠️');
    console.log('🔗 Enrollment link:', result.enrollment_link);
}

main();
```

### 3. Create .env file

```bash
ANTHROPIC_API_KEY=your-anthropic-api-key-here
DOMAIN_NAME=yourdomain.com
DEBUG=true
```

## Deploy Pirate Agent from Scratch

### Step 1: SSH to Server

**Ubuntu/Debian:**
```bash
ssh root@<YOUR_SERVER_IP>
```

**Amazon Linux/EC2:**
```bash
ssh -i <YOUR_PEM_KEY> ec2-user@<YOUR_SERVER_IP>
```

### Step 2: Install All Dependencies

**Ubuntu/Debian:**
```bash
sudo apt update && sudo apt upgrade -y && sudo apt install -y curl wget python3.11 python3.11-pip python3.11-venv certbot && curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt install -y nodejs && sudo dnf install -y gcc-c++ make
```

**Amazon Linux/EC2:**
```bash
sudo dnf update -y && sudo dnf install -y python3.11 python3.11-pip certbot && curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash - && sudo dnf install -y nodejs
```

### Step 3: Generate SSL Certificates

```bash
sudo certbot certonly --standalone -d <YOUR_DOMAIN_NAME>
```

### Step 4: Setup Project Directory

```bash
mkdir -p /home/user/pirate-agent && cd /home/user/pirate-agent && sudo chown -R ec2-user:ec2-user /home/ec2-user/pirate-agent
```

### Step 5: Copy SSL Certificates

```bash
mkdir -p certs && sudo cp -L /etc/letsencrypt/live/<YOUR_DOMAIN_NAME>/fullchain.pem certs/ && sudo cp -L /etc/letsencrypt/live/<YOUR_DOMAIN_NAME>/privkey.pem certs/ && sudo chown $USER:$USER certs/*.pem && chmod 600 certs/*.pem
```

### Step 6: Create Project Files

Copy the 3 files from the "How to Create Your Pirate Agent" section above:
- `package.json` 
- `pirate-agent.js`
- `.env` (with your actual API key and domain)

```bash

scp -i <YOUR_PEM_KEY>  <improvement_agent.js> <package.json> <.env(file with anthropic key and domain)> \
  ec2-user@<YOUR_SERVER_IP>:<path created in step4>


```

### Step 7: Install Dependencies and Run

```bash
npm install 
nohup npm start > pirate-agent.log 2>&1 &
```

### Step 8: Open the log file to get the personal link for signup. 

```bash
cat pirate-agent.log
```

## API Reference

### NANDA Class

```javascript
#!/usr/bin/env node
/**
 * My Custom NANDA Agent
 */
const { NANDA } = require('nanda-adapter-js');
require('dotenv').config();

function createMyImprovement() {
    return async function(messageText) {
        try {
            // Your custom improvement logic here
            // This is just an example - replace with your logic
            let improved = messageText
                .replace(/hello/gi, 'greetings')
                .replace(/hi/gi, 'salutations');
            
            // Make it more formal
            if (improved.length > 0) {
                improved = improved.charAt(0).toUpperCase() + improved.slice(1);
                if (!improved.endsWith('.')) {
                    improved += '.';
                }
            }
            
            return improved;
        } catch (error) {
            console.error('Error in improvement logic:', error);
            return messageText; // Fallback to original
        }
    };
}

async function main() {
    console.log('🚀 Starting My NANDA Agent...');

    // Validate environment variables
    if (!process.env.ANTHROPIC_API_KEY) {
        console.error('❌ ANTHROPIC_API_KEY is required');
        console.log('💡 Get your API key from: https://console.anthropic.com/');
        process.exit(1);
    }

    if (!process.env.DOMAIN_NAME) {
        console.error('❌ DOMAIN_NAME is required for production deployment');
        console.log('💡 Set your domain: export DOMAIN_NAME="yourdomain.com"');
        process.exit(1);
    }

    try {
        // Create NANDA instance with your improvement logic
        const nanda = new NANDA(createMyImprovement(), {
            debug: process.env.DEBUG === 'true'
        });

        // Start the API server
        console.log('🌐 Starting API server...');
        const result = await nanda.startServerAPI({
            anthropicKey: process.env.ANTHROPIC_API_KEY,
            domain: process.env.DOMAIN_NAME,
            port: parseInt(process.env.PORT) || 6000,
            apiPort: parseInt(process.env.API_PORT) || 6001,
            ssl: true,
            cert: '/home/user/certs/fullchain.pem',
            key: '/home/user/certs/privkey.pem'
        });

        console.log('✅ My Agent is now running!');
        console.log('🔗 Enrollment link:', result.enrollment_link);
        console.log('\nPress Ctrl+C to stop the server');

        // Graceful shutdown handlers
        const shutdown = async () => {
            console.log('\n🛑 Shutting down agent...');
            await nanda.stop();
            console.log('👋 Agent stopped successfully!');
            process.exit(0);
        };

        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);

    } catch (error) {
        console.error('❌ Failed to start agent:', error.message);
        process.exit(1);
    }
}

// Error handling
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled Rejection:', error);
    process.exit(1);
});

// Start the agent
if (require.main === module) {
    main();
}
```

### Step 5: Create Environment File

```bash
# Create .env file with your configuration
cat << 'EOF' > .env
# Required: Your Anthropic API key
ANTHROPIC_API_KEY=your-anthropic-api-key-here

# Required: Your domain name (must match SSL certificate)
DOMAIN_NAME=yourdomain.com

# Optional: Enable debug logging
DEBUG=true

# Optional: Custom ports
PORT=6000
API_PORT=6001

# Optional: Python path (if not in default location)
PYTHON_PATH=/usr/bin/python3.11
EOF

# Set secure permissions
chmod 600 .env
```

### Step 6: Run Your Agent

```bash
# Make agent script executable
chmod +x agent.js

# Test run (foreground)
node agent.js

# Production run (background with logs)
nohup node agent.js > agent.log 2>&1 &

# Check logs for enrollment link
tail -f agent.log

# Check if running
ps aux | grep agent.js
```

## Example Improvement Logic Patterns

### Basic Agent

```javascript
const { NANDA } = require('nanda-adapter-js');

function createBasicImprovement() {
    return function(messageText) {
        return messageText
            .replace(/hello/gi, 'greetings')
            .replace(/goodbye/gi, 'farewell')
            .charAt(0).toUpperCase() + messageText.slice(1);
    };
}

const nanda = new NANDA(createBasicImprovement());
```

### Pirate Agent with LangChain

```javascript
const { NANDA } = require('nanda-adapter-js');
const { ChatAnthropic } = require('@langchain/anthropic');
const { PromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');

function createLangChainPirateImprovement() {
    const llm = new ChatAnthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: 'claude-3-haiku-20240307'
    });
    
    const piratePrompt = PromptTemplate.fromTemplate(`
Transform the following message into pirate speak while keeping the core meaning intact.
Original message: {message}
Pirate version:`);
    
    const chain = piratePrompt.pipe(llm).pipe(new StringOutputParser());
    
    return async function(messageText) {
        return await chain.invoke({ message: messageText });
    };
}

const nanda = new NANDA(createLangChainPirateImprovement());
```

### Professional Agent

```javascript
const { NANDA, createTextTransformImprovement } = require('nanda-adapter-js');

const professionalAgent = new NANDA(
    createTextTransformImprovement((message) => {
        return `I hope this message finds you well. ${message} Please let me know if you have any questions.`;
    })
);
```

### With External API

```javascript
const { NANDA } = require('nanda-adapter-js');
const axios = require('axios');

function createAPIImprovement() {
    return async function(messageText) {
        try {
            const response = await axios.post('https://api.example.com/improve', {
                message: messageText
            });
            return response.data.improved;
        } catch (error) {
            console.error('API error:', error);
            return messageText; // Fallback to original
        }
    };
}

const nanda = new NANDA(createAPIImprovement());
```

## 🚀 Production Deployment

### 1. Set Environment Variables

```bash
export ANTHROPIC_API_KEY="your-anthropic-api-key"
export DOMAIN_NAME="your-domain.com"
```

### 2. SSL Certificate Setup

```bash
# Generate Let's Encrypt certificates
sudo certbot certonly --standalone -d your-domain.com

# Copy certificates to project directory
sudo cp -L /etc/letsencrypt/live/your-domain.com/fullchain.pem .
sudo cp -L /etc/letsencrypt/live/your-domain.com/privkey.pem .
sudo chown $USER:$USER fullchain.pem privkey.pem
chmod 600 fullchain.pem privkey.pem
```

### 3. Run Agent

```javascript
// production-agent.js
const { NANDA } = require('nanda-adapter-js');

const nanda = new NANDA(yourImprovementLogic);

nanda.startServerAPI({
    anthropicKey: process.env.ANTHROPIC_API_KEY,
    domain: process.env.DOMAIN_NAME,
    ssl: true
}).then(result => {
    console.log('🚀 Agent running!');
    console.log('Enrollment link:', result.enrollment_link);
});
```

```bash
# Run in production
node production-agent.js

# Or with PM2
pm2 start production-agent.js --name "nanda-agent"
```

## 🛠️ Development

### Running Examples

```bash
# Clone the repository
git clone https://github.com/projnanda/adapter.git
cd adapter
git checkout nodejs_wrapper

# Install dependencies
npm install

# Run examples
cd examples/nodejs
npm install

# Basic example
npm run basic

# Pirate agent (with environment variables)
export ANTHROPIC_API_KEY="your-key"
npm run pirate

# Professional agent
npm run professional
```

### Environment Variables

Create a `.env` file in `examples/nodejs/`:

```bash
ANTHROPIC_API_KEY=your-anthropic-api-key-here
DOMAIN_NAME=your-domain.com
DEBUG=true
```

## 🔍 Troubleshooting

### Python Dependencies

If you encounter Python-related errors:

```bash
# Install Python dependencies manually
python3 -m pip install -r requirements.txt

# Or use the install script
node scripts/install-python-deps.js
```

### Common Issues

**"Python not found"**
- Install Python 3.8 or higher
- Set `pythonPath` option to correct Python executable

**"ANTHROPIC_API_KEY required"**
- Sign up at https://console.anthropic.com/
- Set the environment variable or pass in config

**"SSL certificate not found"**
- Generate certificates with Let's Encrypt
- Ensure certificate files are in the correct location
- Set proper file permissions

**"Port already in use"**
- Change port in configuration
- Kill existing processes: `sudo lsof -ti:6000 | xargs kill -9`

### Debug Mode

Enable debug logging to troubleshoot issues:

```javascript
const nanda = new NANDA(improvementLogic, { debug: true });
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make changes and test
4. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details.

## 🔗 Links

- [Python NANDA Adapter](../README.md)
- [GitHub Repository](https://github.com/projnanda/adapter)
- [NANDA Registry](https://chat.nanda-registry.com)
- [Documentation](https://docs.nanda.ai)

## 🎯 Architecture

The Node.js wrapper uses the following architecture:

```
┌─────────────────┐    JSON/IPC    ┌─────────────────┐
│   Node.js App   │ ───────────► │  Python Bridge  │
│                 │              │                 │
│ - NANDA Class   │              │ - bridge.py     │
│ - Improvement   │              │ - NANDA Core    │
│ - API Wrapper   │              │ - AgentBridge   │
└─────────────────┘              └─────────────────┘
```

This approach provides:
- ✅ Node.js developer experience
- ✅ Python core stability  
- ✅ Full feature compatibility
- ✅ Easy installation via npm
- ✅ TypeScript support