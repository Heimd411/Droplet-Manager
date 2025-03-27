export const successResponse = (data: any, message: string = 'Success') => {
    return {
        status: 'success',
        message,
        data,
    };
};

export const errorResponse = (error: any, message: string = 'An error occurred') => {
    return {
        status: 'error',
        message,
        error,
    };
};