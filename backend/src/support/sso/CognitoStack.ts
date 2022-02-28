import { Construct } from 'constructs';
import { aws_cognito as cognito, Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { IUserPool } from 'aws-cdk-lib/aws-cognito';

export class CognitoStack extends Stack {

    public readonly userPool: IUserPool;

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id);


        this.userPool = new cognito.UserPool(this, 'eluserpool', {
            userPoolName: 'el-userpool',
            removalPolicy: RemovalPolicy.DESTROY,// NOT recommended for production code

            signInAliases: {
                username: true,
                email: true
            },
            autoVerify: { email: true },
            // standardAttributes: {

            //     fullname: {
            //         required: true,
            //         mutable: false,
            //     },
            // },
            // customAttributes: {
            //     'customerID': new cognito.StringAttribute({ minLen: 5, maxLen: 15, mutable: false }),

            // },
            passwordPolicy: {
                minLength: 6,
                // requireLowercase: true,
                // requireUppercase: true,
                // requireDigits: true,
                // requireSymbols: true,
                tempPasswordValidity: Duration.days(3),
            },
            accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,


        });

        this.userPool.addDomain('CognitoDomain', {
            cognitoDomain: {
                domainPrefix: 'el-costumer-portal',
            },
        });

        const client = this.userPool.addClient('customer-portal', {

            oAuth: {
                flows: {
                    authorizationCodeGrant: true,
                    implicitCodeGrant: true,
                },
                scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL],
                callbackUrls: ['https://jwt.ms/'],
                logoutUrls: ['https://jwt.ms/'],
            }
        });

        const clientId = client.userPoolClientId;

    }
}

