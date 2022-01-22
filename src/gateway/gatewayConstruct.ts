import { Construct } from 'constructs';
import { IResource, LambdaIntegration, MockIntegration, PassthroughBehavior, RestApi } from "aws-cdk-lib/aws-apigateway";
import { CampaignConstruct } from '../../services/campaign-service/campaignConstruct';

export class GatewayConstruct extends Construct {
  constructor(scope: Construct, id: string, props?: any) {
    super(scope, id);

    const campaignConstruct = new CampaignConstruct(this, 'campaigns');

    // Create an API Gateway resource for each of the CRUD operations
    const api = new RestApi(this, 'elBackendApi', {
      restApiName: 'el Service'
    });

    campaignConstruct.lambdas.map(({ lambda, path, httpMethod }) => {

      // Integrate the Lambda functions with the API Gateway resource
      const lambdaIntegration = new LambdaIntegration(lambda);

      // add the integration to the API Gateway
      const employeesApi = api.root.addResource(path);
      employeesApi.addMethod(httpMethod, lambdaIntegration);
      addCorsOptions(employeesApi);

    })




  }
}

function addCorsOptions(apiResource: IResource) {
  apiResource.addMethod('OPTIONS', new MockIntegration({
    integrationResponses: [{
      statusCode: '200',
      responseParameters: {
        'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
        'method.response.header.Access-Control-Allow-Origin': "'*'",
        'method.response.header.Access-Control-Allow-Credentials': "'false'",
        'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET,PUT,POST,DELETE'",
      },
    }],
    passthroughBehavior: PassthroughBehavior.NEVER,
    requestTemplates: {
      "application/json": "{\"statusCode\": 200}"
    },
  }), {
    methodResponses: [{
      statusCode: '200',
      responseParameters: {
        'method.response.header.Access-Control-Allow-Headers': true,
        'method.response.header.Access-Control-Allow-Methods': true,
        'method.response.header.Access-Control-Allow-Credentials': true,
        'method.response.header.Access-Control-Allow-Origin': true,
      },
    }]
  })
}

