/**
 * Logger utility class for Yukino
 * Provides consistent logging format and debug mode control
 */
export declare class Logger {
    private readonly _prefix;
    private readonly _debug;
    /**
     * Create a new logger instance
     * @param prefix The prefix to prepend to all log messages (e.g., '[YukinoClient]')
     * @param debug Whether debug mode is enabled
     */
    constructor(prefix: string, debug?: boolean);
    /**
     * Log a debug message (only if debug mode is enabled)
     * @param message The log message
     * @param args Optional additional arguments to log
     */
    debug(message: string, ...args: any[]): void;
    /**
     * Log an informational message (regardless of debug mode)
     * @param message The log message
     * @param args Optional additional arguments to log
     */
    info(message: string, ...args: any[]): void;
    /**
     * Log a warning message (regardless of debug mode)
     * @param message The log message
     * @param args Optional additional arguments to log
     */
    warn(message: string, ...args: any[]): void;
    /**
     * Log an error message (regardless of debug mode)
     * @param message The log message
     * @param args Optional additional arguments to log
     */
    error(message: string, ...args: any[]): void;
    /**
     * Create a child logger with a sub-prefix
     * @param subPrefix The sub-prefix to append to the current prefix
     * @returns A new Logger instance with the combined prefix
     */
    createChildLogger(subPrefix: string): Logger;
    /**
     * Check if debug mode is enabled
     * @returns True if debug mode is enabled
     */
    isDebug(): boolean;
    /**
     * Create a default logger instance for Yukino
     * @param component The name of the component (e.g., 'YukinoClient')
     * @param debug Whether debug mode is enabled
     * @returns A new Logger instance
     */
    static create(component: string, debug?: boolean): Logger;
}
//# sourceMappingURL=Logger.d.ts.map