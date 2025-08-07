# NANDA Adapter - Node.js Wrapper

Node.js wrapper for NANDA Adapter, bringing the power of the Python NANDA core to the JavaScript ecosystem while maintaining the same robust functionality.

## 🚀 Quick Start

### Installation

```bash
npm install nanda-adapter-js
```

The package will automatically set up Python dependencies during installation.

### Basic Usage

```javascript
const { NANDA, createTextTransformImprovement } = require('nanda-adapter-js');

// Create custom improvement logic
const customImprovement = createTextTransformImprovement((message) => {
    return message.replace(/hello/gi, 'greetings').toUpperCase();
});

// Create NANDA instance
const nanda = new NANDA(customImprovement);

// Test improvement
const improved = await nanda.testImprovement('Hello world!');
console.log(improved); // "GREETINGS WORLD!"

// Start server
await nanda.startServerAPI({
    anthropicKey: process.env.ANTHROPIC_API_KEY,
    domain: process.env.DOMAIN_NAME
});
```

## 📖 API Reference

### NANDA Class

#### Constructor
```javascript
const nanda = new NANDA(improvementLogic, options)
```

**Parameters:**
- `improvementLogic`: Function that takes a message string and returns improved version
- `options`: Optional configuration object
  - `pythonPath`: Path to Python executable (default: 'python3')  
  - `debug`: Enable debug logging (default: false)
  - `timeout`: Command timeout in ms (default: 30000)
  - `agentId`: Custom agent ID (default: auto-generated)

#### Methods

**`initialize()`**
Initialize the Python bridge and create the agent.

**`startServer()`**
Start the agent server in basic mode.

**`startServerAPI(config)`**
Start the agent API server with SSL support.

Config parameters:
- `anthropicKey`: Anthropic API key (required)
- `domain`: Domain name for SSL certificates (required)
- `agentId`: Agent ID (optional)
- `port`: Agent bridge port (default: 6000)
- `apiPort`: Flask API port (default: 6001)
- `ssl`: Enable SSL (default: true)

**`testImprovement(message)`**
Test the improvement logic with a sample message.

**`stop()`**
Stop the agent server and cleanup resources.

**`getStatus()`**
Get agent status and information.

### Helper Functions

**`createTextTransformImprovement(transformFn)`**
Create a simple text transformation improvement function.

**`createAsyncImprovement(asyncFn)`**
Create an async improvement function for API calls.

**`createTemplateImprovement(template)`**
Create a template-based improvement function using `{message}` placeholder.

## 🔧 Examples

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