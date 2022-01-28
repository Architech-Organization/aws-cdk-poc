
import { App, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { Code, LayerVersion, Runtime } from "aws-cdk-lib/aws-lambda";
import * as ssm from 'aws-cdk-lib/aws-ssm';

export class LambdaLayersStack extends Stack {

    constructor(scope: App, id: string, props?: StackProps) {
        super(scope, id, props);

        const yupParamName = '/layers/yup';

        // 👇 yup library layer
        const yupLayer = new LayerVersion(this, 'yup-layer', {
            compatibleRuntimes: [
                Runtime.NODEJS_14_X,
            ],
            code: Code.fromAsset('common/layers/yup-utils'), ///Users/ridakaddir/WebstormProjects/el-cdk/backend/common/layers/yup-utils/nodejs/yup-utils.ts
            description: 'Uses a 3rd party library yup',
        });

        new ssm.StringParameter(this, 'VersionArn', {
            parameterName: yupParamName,
            stringValue: yupLayer.layerVersionArn,
        });

    }

}