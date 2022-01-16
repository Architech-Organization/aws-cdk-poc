import {RemovalPolicy} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {Runtime} from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import {NodejsFunction, NodejsFunctionProps} from "aws-cdk-lib/aws-lambda-nodejs";
import {join} from "path";

export class CampaignConstruct extends Construct {

  public readonly lambdas: { lambda: NodejsFunction, path: string , httpMethod: string }[] = [];

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const table = new dynamodb.Table(this, 'campaigns', {
      partitionKey: { name: 'campaignType', type: dynamodb.AttributeType.STRING },
      tableName: 'campaigns',
      removalPolicy: RemovalPolicy.DESTROY, // NOT recommended for production code
    });

    const nodeJsFunctionProps: NodejsFunctionProps = {
      bundling: {
        externalModules: [
          'aws-sdk', // Use the 'aws-sdk' available in the Lambda runtime
        ],
      },
      depsLockFilePath: join(__dirname, '../../package-lock.json'),
      environment: {
        PRIMARY_KEY: 'campaignId',
        PARTITION_KEY: 'campaignType',
        TABLE_NAME: table.tableName,
      },
      runtime: Runtime.NODEJS_14_X,
    }

    /*
    * Load lambdas
    * */
    const createCampaignLambda = new NodejsFunction(this, 'createCampaignFunction', {
      entry: join(__dirname ,'lambdas/CreateCampaignFunction.ts'),
      ...nodeJsFunctionProps,
    });


    this.lambdas.push({lambda: createCampaignLambda, path: "campaigns", httpMethod: "POST"});

    table.grantWriteData(createCampaignLambda);


  }
}


