import { Stack } from "aws-cdk-lib";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction, NodejsFunctionProps } from "aws-cdk-lib/aws-lambda-nodejs";
import { join } from "path";

export abstract class MicroServiceStack extends Stack {

    public readonly lambdas: { lambda: NodejsFunction, path: string, httpMethod: string }[] = [];

    defultNodeJsFunctionProps: NodejsFunctionProps = {
        bundling: {
            externalModules: [
                'aws-sdk', // Use the 'aws-sdk' available in the Lambda runtime
            ],
        },
        depsLockFilePath: join(__dirname, '../package-lock.json'),
        runtime: Runtime.NODEJS_14_X,
    }

    registerFunctionEndpoint = (entry: string, path: string, httpMethod: string, environment?: any): NodejsFunction => {
        const lambda = new NodejsFunction(this, 'createCampaignFunction', {
            ...this.defultNodeJsFunctionProps,
            entry,
            environment,
        });
        this.lambdas.push({ lambda, path, httpMethod });
        return lambda;

    }

}