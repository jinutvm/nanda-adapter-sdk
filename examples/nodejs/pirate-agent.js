#!/usr/bin/env node
/**
 * Pirate Agent Example - LangChain Version
 * 
 * This example creates a pirate-themed agent that uses LangChain to transform messages into pirate speak
 */

const { NANDA } = require('../../lib/index');
const { ChatAnthropic } = require('@langchain/anthropic');
const { PromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');
require('dotenv').config();

function createLangChainPirateImprovement() {
    // Initialize LangChain components
    const llm = new ChatAnthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: 'claude-3-haiku-20240307',
        temperature: 0.7
    });
    
    const piratePrompt = PromptTemplate.fromTemplate(`
Transform the following message into pirate speak while keeping the core meaning intact. Use pirate vocabulary, grammar, and expressions. Be creative but authentic to pirate language.

Examples of transformations:
- "hello" → "ahoy"
- "friend" → "matey" 
- "you" → "ye"
- "yes" → "aye"
- "money" → "doubloons"
- "bathroom" → "head"
- "kitchen" → "galley"

Add pirate expressions like "Arrr!", "Shiver me timbers!", "Avast ye!" when appropriate.

Original message: {message}

Pirate version:`);
    
    // Create the chain
    const chain = piratePrompt.pipe(llm).pipe(new StringOutputParser());
    
    // Return the improvement function
    return async function langchainPirateImprovement(messageText) {
        console.log('🤖 Using LangChain to transform message to pirate speak...');
        
        const pirateMessage = await chain.invoke({
            message: messageText
        });
        
        return pirateMessage.trim();
    };
}

async function main() {
    console.log('🏴‍☠️ Ahoy! Starting Pirate Agent...\n');
    
    // Check environment variables
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const domainName = process.env.DOMAIN_NAME;
    
    if (!anthropicKey) {
        console.error('❌ ANTHROPIC_API_KEY environment variable is required');
        console.log('💡 Set it with: export ANTHROPIC_API_KEY="your-api-key"');
        process.exit(1);
    }
    
    try {
        // Create pirate NANDA instance with LangChain
        const nanda = new NANDA(createLangChainPirateImprovement(), {
            debug: process.env.DEBUG === 'true',
            agentId: 'langchain_pirate_agent'
        });
        
        // Test the improvement logic
        console.log('🧪 Testing pirate improvement logic:');
        const testMessages = [
            'Hello there, my friend!',
            'How are you doing today?',
            'I need to find some money for my boat',
            'Yes, that treasure looks valuable'
        ];
        
        for (const message of testMessages) {
            const improved = await nanda.testImprovement(message);
            console.log(`🗣️  Original: "${message}"`);
            console.log(`🏴‍☠️ Pirate:   "${improved}"`);
            console.log();
        }
        
        // Start API server if domain is provided
        if (domainName) {
            console.log('🌐 Starting API server with SSL...');
            
            const result = await nanda.startServerAPI({
                anthropicKey: anthropicKey,
                domain: domainName,
                agentId: 'langchain_pirate_agent',
                port: 6000,
                apiPort: 6001,
                ssl: true,
                // Optional: Specify custom certificate paths
                // cert: '/home/user/certs/fullchain.pem',
                // key: '/home/user/certs/privkey.pem'
                // If not specified, defaults to Let's Encrypt paths for the domain
            });
            
            console.log('✅ Pirate agent server started!');
            
            if (result.enrollment_link) {
                console.log('🔗 Agent enrollment link:');
                console.log(result.enrollment_link);
            }
            
            console.log('\\n🏴‍☠️ Pirate agent is ready to sail the digital seas!');
            console.log('Press Ctrl+C to stop the server');
            
            // Keep process alive
            process.on('SIGINT', async () => {
                console.log('\\n⚓ Dropping anchor... Shutting down pirate agent');
                await nanda.stop();
                console.log('🏴‍☠️ Farewell, matey!');
                process.exit(0);
            });
            
            // Keep the process running
            setInterval(() => {
                // Keep alive
            }, 1000);
            
        } else {
            console.log('💡 To run the full server, set DOMAIN_NAME environment variable');
            console.log('💡 Example: export DOMAIN_NAME="your-domain.com"');
            console.log('\\n✅ Pirate improvement logic test completed!');
        }
        
    } catch (error) {
        console.error('❌ Arrr! Something went wrong:', error.message);
        process.exit(1);
    }
}

// Handle cleanup
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled Rejection:', error);
    process.exit(1);
});

// Run the example
if (require.main === module) {
    main();
}