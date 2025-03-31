export function errorHandler (err, req, res, next){
    console.error("Error: ", err.stack);
    
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        error: err.message || "Internal Server Error",
        stack: process.env.NODE_ENV === 'development' ? err.stack: undefined
    });
}

export function notFound(req, res, next){
    const error = new Error(`Not Found - ${req.originalUrl}`);
    error.statusCode = 404;
    next(error);
}