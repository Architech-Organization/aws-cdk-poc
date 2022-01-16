import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {GatewayConstruct} from "../src/gateway/gatewayConstruct";

export class BackendStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        new GatewayConstruct(this, 'Gateway', {
        })
    }
}