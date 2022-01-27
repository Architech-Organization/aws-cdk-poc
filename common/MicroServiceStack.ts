import { Stack } from "aws-cdk-lib";
import { Code, LayerVersion, Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction, NodejsFunctionProps } from "aws-cdk-lib/aws-lambda-nodejs";
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

        depsLockFilePath: join(__dirname, '../package-lock.json'),
        runtime: Runtime.NODEJS_14_X,
    }

    registerFunctionEndpoint = (entry: string, path: string, httpMethod: string, environment?: any): NodejsFunction => {

        const yupLayer = new LayerVersion(this, 'yup-layer', {
            compatibleRuntimes: [
                Runtime.NODEJS_14_X,
            ],
            code: Code.fromAsset('common/layers/yup-utils'), ///Users/ridakaddir/WebstormProjects/el-cdk/backend/common/layers/yup-utils/nodejs/yup-utils.ts
            description: 'Uses a 3rd party library yup',
        });

        const lambda = new NodejsFunction(this, 'createCampaignFunction', {
            ...this.defultNodeJsFunctionProps,
            layers: [yupLayer],
            entry,
            environment,
        });
        this.lambdas.push({ lambda, path, httpMethod });
        return lambda;

    }

}