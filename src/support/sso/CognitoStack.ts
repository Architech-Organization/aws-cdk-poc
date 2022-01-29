import { Construct } from 'constructs';
import { aws_cognito as cognito, Duration, Stack, StackProps } from 'aws-cdk-lib';

export class CognitoStack extends Stack {


    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id);


        const pool = new cognito.UserPool(this, 'eluserpool', {
            userPoolName: 'el-userpool',

            signInAliases: {
                username: true,
                email: true
            },
            autoVerify: { email: true },
            standardAttributes: {

                fullname: {
                    required: true,
                    mutable: false,
                },
            },
            customAttributes: {
                'customerID': new cognito.StringAttribute({ minLen: 5, maxLen: 15, mutable: false }),

            },
            passwordPolicy: {
                minLength: 12,
                requireLowercase: true,
                requireUppercase: true,
                requireDigits: true,
                requireSymbols: true,
                tempPasswordValidity: Duration.days(3),
            },
            accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,


        });

        pool.addDomain('CognitoDomain', {
            cognitoDomain: {
                domainPrefix: 'el-costumer-portal',
            },
        });

        const client = pool.addClient('customer-portal', {
            oAuth: {
                flows: {
                    authorizationCodeGrant: true,
                },
                scopes: [cognito.OAuthScope.OPENID],
                callbackUrls: ['http://localhost:3000/callback'],
                logoutUrls: ['http://localhost:3000/logout'],
            }
        });

        const clientId = client.userPoolClientId;

    }
}

