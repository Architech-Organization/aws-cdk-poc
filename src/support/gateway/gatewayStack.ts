import { Construct } from 'constructs';
import { AuthorizationType, CognitoUserPoolsAuthorizer, IResource, LambdaIntegration, MockIntegration, PassthroughBehavior, RestApi } from "aws-cdk-lib/aws-apigateway";
import { Stack, StackProps } from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { IUserPool } from 'aws-cdk-lib/aws-cognito';

export class GatewayStack extends Stack {

  private readonly endpoints: { lambda: NodejsFunction, path: string, httpMethod: string }[];

  constructor(scope: Construct, id: string, endpoints: { lambda: NodejsFunction, path: string, httpMethod: string }[], userPool: IUserPool, props?: StackProps) {
    super(scope, id);

    this.endpoints = endpoints;
    // Create an API Gateway resource for each of the CRUD operations
    const api = new RestApi(this, 'elBackendApi', {
      restApiName: 'el Service'
    });

    const auth = new CognitoUserPoolsAuthorizer(this, 'campaignAuthorizer', {
      cognitoUserPools: [userPool]
    });


    this.endpoints.map(({ lambda, path, httpMethod }) => {

      // Integrate the Lambda functions with the API Gateway resource
      const lambdaIntegration = new LambdaIntegration(lambda);

      // add the integration to the API Gateway
      const employeesApi = api.root.addResource(path);
      employeesApi.addMethod(httpMethod, lambdaIntegration, {
        authorizer: auth,
        authorizationType: AuthorizationType.COGNITO,
      });
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

