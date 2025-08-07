#!/usr/bin/env node
/**
 * Basic NANDA Node.js Example
 * 
 * This example shows how to create a simple agent with custom improvement logic
 */

const { NANDA, createTextTransformImprovement } = require('../../lib/index');

function createCustomImprovement() {
    return createTextTransformImprovement((messageText) => {
        // Simple text transformations
        let improved = messageText
            .replace(/hello/gi, 'greetings')
            .replace(/goodbye/gi, 'farewell')
            .replace(/\bhi\b/gi, 'salutations');
        
        // Capitalize first letter
        improved = improved.charAt(0).toUpperCase() + improved.slice(1);
        
        // Add some flair if the message is short
        if (improved.length < 20) {
            improved += ' ✨';
        }
        
        return improved;
    });
}

async function main() {
    console.log('🚀 Starting Basic NANDA Example...\n');
    
    try {
        // Create NANDA instance with custom improvement logic
        const nanda = new NANDA(createCustomImprovement(), {
            debug: true,
            agentId: 'basic_example_agent'
        });
        
        // Test the improvement logic
        console.log('🧪 Testing improvement logic:');
        const testMessage = 'Hello there! How are you doing?';
        
        const improved = await nanda.testImprovement(testMessage);
        console.log(`Original: "${testMessage}"`);
        console.log(`Improved: "${improved}"`);
        console.log();
        
        // Get status
        const status = await nanda.getStatus();
        console.log('📊 Agent Status:', status);
        console.log();
        
        // Start basic server (commented out for example)
        /*
        console.log('🌐 Starting server...');
        await nanda.startServer();
        
        console.log('✅ Server is running!');
        console.log('Press Ctrl+C to stop');
        
        // Keep process alive
        process.on('SIGINT', async () => {
            console.log('\\n🛑 Shutting down...');
            await nanda.stop();
            process.exit(0);
        });
        */
        
        console.log('✅ Basic example completed successfully!');
        console.log('💡 Uncomment the server code above to run the agent server');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
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