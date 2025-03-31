import env from "../config/env";

const getTimestamp = ()=>{
    return new Date().toISOString();
};

const logger = {
    info: (message, meta = {}) => {
        if(['debug', 'info', 'warn', 'error'].includes(env.logging.level)){
            console.log(`[${getTimestamp()}] [INFO] ${message}`, Object.keys(meta).length ? meta : '');
        }
    },
    debug: (message, meta = {}) => {
        if (['debug'].includes(env.logging.level)) {
          console.debug(`[${getTimestamp()}] [DEBUG] ${message}`, Object.keys(meta).length ? meta : '');
        }
    },
    warn: (message, meta = {}) => {
        if (['debug', 'info', 'warn', 'error'].includes(env.logging.level)) {
          console.warn(`[${getTimestamp()}] [WARN] ${message}`, Object.keys(meta).length ? meta : '');
        }
    },
    error: (message, error) => {
        if (['debug', 'info', 'warn', 'error'].includes(env.logging.level)) {
          console.error(`[${getTimestamp()}] [ERROR] ${message}`, error);
        }
    }
}

export default logger;