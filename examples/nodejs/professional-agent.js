#!/usr/bin/env node
/**
 * Professional Agent Example
 * 
 * This example creates a professional business communication agent
 */

const { NANDA, createTextTransformImprovement } = require('../../lib/index');
require('dotenv').config();

function createProfessionalImprovement() {
    const professionalPhrases = {
        beginnings: [
            'I hope this message finds you well.',
            'Thank you for your inquiry.',
            'I appreciate you reaching out.',
            'Following up on our conversation,',
            'As per our discussion,'
        ],
        
        endings: [
            'Please let me know if you have any questions.',
            'I look forward to your response.',
            'Thank you for your time and consideration.',
            'Best regards for a productive day.',
            'I appreciate your attention to this matter.'
        ]
    };
    
    const casualToProfessional = {
        'hey': 'hello',
        'hi there': 'greetings',
        'what\'s up': 'how are you',
        'gonna': 'going to',
        'wanna': 'want to',
        'gotta': 'need to',
        'yeah': 'yes',
        'nah': 'no',
        'kinda': 'somewhat',
        'sorta': 'somewhat',
        'lots of': 'many',
        'tons of': 'numerous',
        'super': 'very',
        'awesome': 'excellent',
        'cool': 'interesting',
        'weird': 'unusual',
        'crazy': 'remarkable'
    };
    
    return createTextTransformImprovement((messageText) => {
        let professional = messageText;
        
        // Replace casual language
        for (const [casual, formal] of Object.entries(casualToProfessional)) {
            const regex = new RegExp(`\\b${casual}\\b`, 'gi');
            professional = professional.replace(regex, formal);
        }
        
        // Ensure proper capitalization
        professional = professional.replace(/\b\w/g, (char, index) => {
            // Capitalize first letter of sentences
            if (index === 0 || messageText[index - 2] === '.') {
                return char.toUpperCase();
            }
            return char;
        });
        
        // Add professional greeting if message is short and lacks one
        const hasGreeting = /^(hello|hi|greetings|dear)/i.test(professional.trim());
        if (!hasGreeting && professional.length < 100) {
            const greeting = professionalPhrases.beginnings[
                Math.floor(Math.random() * professionalPhrases.beginnings.length)
            ];
            professional = `${greeting} ${professional}`;
        }
        
        // Add professional closing if message lacks one
        const hasClosing = /(regards|sincerely|thank you|thanks)/i.test(professional);
        if (!hasClosing && professional.length > 20) {
            const closing = professionalPhrases.endings[
                Math.floor(Math.random() * professionalPhrases.endings.length)
            ];
            professional += ` ${closing}`;
        }
        
        // Ensure proper sentence structure
        professional = professional.replace(/([.!?])(\s*)([a-z])/g, (match, punct, space, char) => {
            return punct + ' ' + char.toUpperCase();
        });
        
        return professional;
    });
}

async function main() {
    console.log('💼 Starting Professional Agent...\n');
    
    // Check environment variables
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const domainName = process.env.DOMAIN_NAME;
    
    if (!anthropicKey) {
        console.error('❌ ANTHROPIC_API_KEY environment variable is required');
        console.log('💡 Set it with: export ANTHROPIC_API_KEY="your-api-key"');
        process.exit(1);
    }
    
    try {
        // Create professional NANDA instance
        const nanda = new NANDA(createProfessionalImprovement(), {
            debug: process.env.DEBUG === 'true',
            agentId: 'professional_agent'
        });
        
        // Test the improvement logic
        console.log('🧪 Testing professional improvement logic:');
        const testMessages = [
            'hey, what\'s up with the project?',
            'yeah, that\'s a cool idea',
            'gonna need to check on this',
            'this is kinda weird but awesome',
            'thanks for the update'
        ];
        
        for (const message of testMessages) {
            const improved = await nanda.testImprovement(message);
            console.log(`💬 Casual:       "${message}"`);
            console.log(`💼 Professional: "${improved}"`);
            console.log();
        }
        
        // Start API server if domain is provided
        if (domainName) {
            console.log('🌐 Starting professional API server with SSL...');
            
            const result = await nanda.startServerAPI({
                anthropicKey: anthropicKey,
                domain: domainName,
                agentId: 'professional_agent',
                port: 6000,
                apiPort: 6001,
                ssl: true,
                // Optional: Specify custom certificate paths
                // cert: '/home/user/certs/fullchain.pem',
                // key: '/home/user/certs/privkey.pem'
                // If not specified, defaults to Let's Encrypt paths for the domain
            });
            
            console.log('✅ Professional agent server started!');
            
            if (result.enrollment_link) {
                console.log('🔗 Agent enrollment link:');
                console.log(result.enrollment_link);
            }
            
            console.log('\\n💼 Professional agent is ready to enhance your communications!');
            console.log('Press Ctrl+C to stop the server');
            
            // Keep process alive
            process.on('SIGINT', async () => {
                console.log('\\n🛑 Shutting down professional agent...');
                await nanda.stop();
                console.log('💼 Professional agent stopped. Have a productive day!');
                process.exit(0);
            });
            
            // Keep the process running
            setInterval(() => {
                // Keep alive
            }, 1000);
            
        } else {
            console.log('💡 To run the full server, set DOMAIN_NAME environment variable');
            console.log('💡 Example: export DOMAIN_NAME="your-domain.com"');
            console.log('\\n✅ Professional improvement logic test completed!');
        }
        
    } catch (error) {
        console.error('❌ Error in professional agent:', error.message);
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