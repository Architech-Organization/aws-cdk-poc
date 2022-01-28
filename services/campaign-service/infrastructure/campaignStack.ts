import { RemovalPolicy, StackProps } from 'aws-cdk-lib';

import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { join } from "path";
import { Construct } from 'constructs';
import { MicroServiceStack } from '../../../common/MicroServiceStack';
import { LayerVersion } from 'aws-cdk-lib/aws-lambda';

export class CampaignStack extends MicroServiceStack {

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id);

    const table = new dynamodb.Table(this, 'campaigns', {
      partitionKey: { name: 'campaignType', type: dynamodb.AttributeType.STRING },
      tableName: 'campaigns',
      removalPolicy: RemovalPolicy.DESTROY, // NOT recommended for production code
    });

    const entry = join(__dirname, '../lambdas/CreateCampaignFunction.ts');
    const environment = {
      PRIMARY_KEY: 'campaignId',
      PARTITION_KEY: 'campaignType',
      TABLE_NAME: table.tableName,
    }

    const createCampaignLambda = this.registerFunctionEndpoint(entry, "campaigns", "POST", environment);
    table.grantWriteData(createCampaignLambda);


  }
}


