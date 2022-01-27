
import { App, Stack, StackProps } from "aws-cdk-lib";
import { Code, LayerVersion, Runtime } from "aws-cdk-lib/aws-lambda";

export class LambdaLayersStack extends Stack {

    public readonly layers: LayerVersion[] = [];

    constructor(scope: App, id: string, props?: StackProps) {
        super(scope, id, props);

        // 👇 yup library layer
        const yupLayer = new LayerVersion(this, 'yup-layer', {
            compatibleRuntimes: [
                Runtime.NODEJS_14_X,
            ],
            code: Code.fromAsset('common/layers/yup-utils/nodejs'), ///Users/ridakaddir/WebstormProjects/el-cdk/backend/common/layers/yup-utils/nodejs/yup-utils.ts
            description: 'Uses a 3rd party library yup',
        });


        this.layers.push(yupLayer);
    }

}