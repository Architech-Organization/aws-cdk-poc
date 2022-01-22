import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CampaignStack } from '../services/campaign-service/campaignStack';
import { GatewayStack } from "../support/gateway/gatewayStack";

export class BackendStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        // const campaignStack = new CampaignStack(this, 'compaign-servie', {});

        // const endpoints = [...campaignStack.lambdas,];

        // new GatewayStack(this, 'Gateway', endpoints, {
        // })
    }
}