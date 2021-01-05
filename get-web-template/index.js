'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

module.exports = async (context, req) => {
    try {

        if (!utils.authenticateRequest(context, req)) {
            utils.setContextResError(
                context,
                new errors.UserNotAuthenticatedError(
                    'Unable to authenticate user.',
                    401
                )
            );
            return Promise.reject();
        }
        var token = utils.decodeToken(req.headers.authorization);
        const user = await request.get(`${process.env.USER_API_URL}/api/v1/users/${token._id}`, { //Get User
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        const userMerchants = [];
        if (user && user.merchants && Array.isArray(user.merchants)) {
            user.merchants.forEach(element => {
                userMerchants.push(element.merchantID);
            });
            
        }
        const result = await request.get(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/web-templates/${req.params.id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            },
            body: { userMerchants: userMerchants }
        });
        let isAbleToGet = false;
       
        if (result && result.adminRights && Array.isArray(result.adminRights)) {
            for (let i = 0; i < result.adminRights.length; i++) {
                const element = result.adminRights[i];
                if (userMerchants.includes(element.merchantID) && element.roles) {
                    isAbleToGet = true;
                }
            }
        }
        if (isAbleToGet) {
            context.res = {
                body: result
            };
        } else {
            utils.setContextResError(
                context,
                new errors.WebTemplateNotFoundError(
                    'The id specified in the URL doesn\'t exist.',
                    404
                )
            );
        }
        return Promise.resolve();

    } catch (error) {
        utils.handleError(context, error);
    }
};
