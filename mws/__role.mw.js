module.exports = ({ managers }) => {
    return (requiredRole) => {
        return ({ req, res, next }) => {
            const token = req.headers.token;
            if (!token) {
                console.log('Token is required but not found');
                return managers.responseDispatcher.dispatch(res, { ok: false, code: 401, errors: 'Unauthorized' });
            }

            const decoded = managers.token.verifyLongToken({ token });
            if (!decoded) {
                console.log('Failed to decode token');
                return managers.responseDispatcher.dispatch(res, { ok: false, code: 401, errors: 'Unauthorized' });
            }

            // Check if the user role matches the required role
            if (decoded.role !== requiredRole) {
                console.log('Access denied: insufficient permissions');
                return managers.responseDispatcher.dispatch(res, { ok: false, code: 403, errors: 'Forbidden' });
            }

            // Attach user information to request for further use
            req.user = decoded;
            next();
        };
    };
};
