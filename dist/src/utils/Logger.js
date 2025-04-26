/**
 * Logger utility class for Yukino
 * Provides consistent logging format and debug mode control
 */
export class Logger {
    /**
     * Create a new logger instance
     * @param prefix The prefix to prepend to all log messages (e.g., '[YukinoClient]')
     * @param debug Whether debug mode is enabled
     */
    constructor(prefix, debug = false) {
        this._prefix = prefix;
        this._debug = debug;
    }
    /**
     * Log a debug message (only if debug mode is enabled)
     * @param message The log message
     * @param args Optional additional arguments to log
     */
    debug(message, ...args) {
        if (!this._debug)
            return;
        if (args.length > 0) {
            console.log(`${this._prefix} ${message}`, ...args);
        }
        else {
            console.log(`${this._prefix} ${message}`);
        }
    }
    /**
     * Log an informational message (regardless of debug mode)
     * @param message The log message
     * @param args Optional additional arguments to log
     */
    info(message, ...args) {
        if (args.length > 0) {
            console.log(`${this._prefix} ${message}`, ...args);
        }
        else {
            console.log(`${this._prefix} ${message}`);
        }
    }
    /**
     * Log a warning message (regardless of debug mode)
     * @param message The log message
     * @param args Optional additional arguments to log
     */
    warn(message, ...args) {
        if (args.length > 0) {
            console.warn(`${this._prefix} ${message}`, ...args);
        }
        else {
            console.warn(`${this._prefix} ${message}`);
        }
    }
    /**
     * Log an error message (regardless of debug mode)
     * @param message The log message
     * @param args Optional additional arguments to log
     */
    error(message, ...args) {
        if (args.length > 0) {
            console.error(`${this._prefix} ${message}`, ...args);
        }
        else {
            console.error(`${this._prefix} ${message}`);
        }
    }
    /**
     * Create a child logger with a sub-prefix
     * @param subPrefix The sub-prefix to append to the current prefix
     * @returns A new Logger instance with the combined prefix
     */
    createChildLogger(subPrefix) {
        return new Logger(`${this._prefix}${subPrefix}`, this._debug);
    }
    /**
     * Check if debug mode is enabled
     * @returns True if debug mode is enabled
     */
    isDebug() {
        return this._debug;
    }
    /**
     * Create a default logger instance for Yukino
     * @param component The name of the component (e.g., 'YukinoClient')
     * @param debug Whether debug mode is enabled
     * @returns A new Logger instance
     */
    static create(component, debug = false) {
        return new Logger(`[${component}]`, debug);
    }
}
//# sourceMappingURL=Logger.js.map