/**
 * TypeScript definitions for NANDA Adapter Node.js wrapper
 */

export interface NANDAOptions {
  /** Path to Python executable (default: 'python3') */
  pythonPath?: string;
  /** Enable debug logging (default: false) */
  debug?: boolean;
  /** Command timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Agent ID (default: auto-generated) */
  agentId?: string;
}

export interface ServerAPIConfig {
  /** Anthropic API key (required) */
  anthropicKey: string;
  /** Domain name for SSL certificates (required) */
  domain: string;
  /** Agent ID (optional, defaults to auto-generated) */
  agentId?: string;
  /** Agent bridge port (default: 6000) */
  port?: number;
  /** Flask API port (default: 6001) */
  apiPort?: number;
  /** Registry URL (optional) */
  registry?: string;
  /** Public URL for the Agent Bridge (optional) */
  publicUrl?: string;
  /** API URL for the User Client (optional) */
  apiUrl?: string;
  /** Path to SSL certificate file (optional) */
  cert?: string;
  /** Path to SSL key file (optional) */
  key?: string;
  /** Enable SSL (default: true) */
  ssl?: boolean;
}

export interface AgentStatus {
  /** Whether the bridge is initialized */
  initialized: boolean;
  /** Whether the server is running */
  running: boolean;
  /** Agent ID */
  agent_id?: string;
  /** Error message if any */
  error?: string;
  /** Additional status from Python bridge */
  [key: string]: any;
}

export interface ServerStartResult {
  /** Enrollment link for agent registration */
  enrollment_link?: string;
  /** Additional result data */
  [key: string]: any;
}

/**
 * Improvement logic function type
 * @param messageText - The input message text to improve
 * @returns The improved message text
 */
export type ImprovementLogic = (messageText: string) => string | Promise<string>;

/**
 * Text transformation function type
 */
export type TextTransformFunction = (text: string) => string;

/**
 * Async improvement function type
 */
export type AsyncImprovementFunction = (messageText: string) => Promise<string>;

/**
 * Main NANDA class
 */
export declare class NANDA {
  constructor(improvementLogic: ImprovementLogic, options?: NANDAOptions);
  
  /**
   * Initialize the Python bridge and create the agent
   */
  initialize(): Promise<NANDA>;
  
  /**
   * Start the agent server (basic mode)
   */
  startServer(): Promise<any>;
  
  /**
   * Start the agent API server with SSL support
   */
  startServerAPI(config: ServerAPIConfig): Promise<ServerStartResult>;
  
  /**
   * Test the improvement logic with a sample message
   */
  testImprovement(message: string): Promise<string>;
  
  /**
   * Stop the agent server and cleanup
   */
  stop(): Promise<void>;
  
  /**
   * Get agent status and information
   */
  getStatus(): Promise<AgentStatus>;
}

/**
 * Create a simple text transformation improvement function
 */
export declare function createTextTransformImprovement(
  transformFn: TextTransformFunction
): ImprovementLogic;

/**
 * Create an async improvement function (for API calls, etc.)
 */
export declare function createAsyncImprovement(
  asyncFn: AsyncImprovementFunction
): ImprovementLogic;

/**
 * Create a template-based improvement function
 */
export declare function createTemplateImprovement(template: string): ImprovementLogic;

/**
 * Python Bridge class for internal use
 */
export declare class PythonBridge {
  constructor(options?: NANDAOptions);
  
  start(): Promise<void>;
  executeCommand(command: string, data?: any): Promise<any>;
  stop(): Promise<void>;
  on(eventName: string, handler: (data: any) => void): void;
  off(eventName: string, handler: (data: any) => void): void;
}

/**
 * Re-export main components
 */
export {
  NANDA as default,
  NANDA,
  createTextTransformImprovement,
  createAsyncImprovement,
  createTemplateImprovement
};