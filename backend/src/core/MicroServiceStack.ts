import { Stack } from "aws-cdk-lib";
import { Code, LayerVersion, Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction, NodejsFunctionProps } from "aws-cdk-lib/aws-lambda-nodejs";
import * as ssm from 'aws-cdk-lib/aws-ssm';

import { join } from "path";

export abstract class MicroServiceStack extends Stack {

    public readonly lambdas: { lambda: NodejsFunction, path: string, httpMethod: string }[] = [];


    defultNodeJsFunctionProps: NodejsFunctionProps = {
        bundling: {
            minify: false,
            externalModules: [
                'aws-sdk', // Use the 'aws-sdk' available in the Lambda runtime
                'yup'
            ],

        },

        depsLockFilePath: join(__dirname, '../../../package-lock.json'),
        runtime: Runtime.NODEJS_14_X,
    }

    registerFunctionEndpoint = (entry: string, path: string, httpMethod: string, environment?: any): NodejsFunction => {

        const yupParamName = '/layers/yup';

        // fetch the Arn from param store
        const yupLayerArn = ssm.StringParameter.valueForStringParameter(
            this,
            yupParamName
        );
        // generate layerversion from arn 
        const yupLayer = LayerVersion.fromLayerVersionArn(
            this,
            'YupLayerFromArn',
            yupLayerArn
        );

        const lambda = new NodejsFunction(this, 'createCampaignFunction', {
            ...this.defultNodeJsFunctionProps,
            entry,
            layers: [yupLayer],
            environment,
        });
        this.lambdas.push({ lambda, path, httpMethod });
        return lambda;

    }

}