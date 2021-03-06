#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { LambdaLayersStack } from '../backend/src/core/LambdaLayersStack';
import { CognitoStack } from '../backend/src/support/sso/CognitoStack';
import { CampaignStack } from '../backend/src/services/campaign-service/infrastructure/campaignStack';
import { GatewayStack } from '../backend/src/support/gateway/gatewayStack';
import { EventBridgeStack } from '../backend/src/support/eventbus/EventBridgeStack';




const app = new cdk.App();

new LambdaLayersStack(app, 'lambda-layers', {});

const cognito = new CognitoStack(app, 'el-cognito', {});

const campaignStack = new CampaignStack(app, 'compaign-servie', {});

const endpoints = [...campaignStack.lambdas,];

const eventBridge = new EventBridgeStack(app, "myEventBridge", {});

new GatewayStack(app, 'Gateway', endpoints, eventBridge.eventBridgeRestApiIntegration, cognito.userPool, {
})


/*let campaignStack = new CampaignStack(app, 'CampaignStack', {
  /!* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. *!/

  /!* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. *!/
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },

  /!* Uncomment the next line if you know exactly what Account and Region you
   * want to deploy the stack to. *!/
  // env: { account: '123456789012', region: 'us-east-1' },

  /!* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html *!/
});*/
// new BackendStack(app, 'BackendStack', {
// });

