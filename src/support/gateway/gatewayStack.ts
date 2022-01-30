import { Construct } from 'constructs';
import { AuthorizationType, CognitoUserPoolsAuthorizer, Integration, IResource, JsonSchemaType, JsonSchemaVersion, LambdaIntegration, MockIntegration, Model, PassthroughBehavior, RequestValidator, RestApi } from "aws-cdk-lib/aws-apigateway";
import { Stack, StackProps } from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { IUserPool } from 'aws-cdk-lib/aws-cognito';
export class GatewayStack extends Stack {

  private readonly endpoints: { lambda: NodejsFunction, path: string, httpMethod: string }[];

  constructor(scope: Construct, id: string, endpoints: { lambda: NodejsFunction, path: string, httpMethod: string }[], eventBridgeRestApiIntegration: Integration, userPool: IUserPool, props?: StackProps) {
    super(scope, id);

    this.endpoints = endpoints;
    // Create an API Gateway resource for each of the CRUD operations
    const api = new RestApi(this, 'elBackendApi', {
      restApiName: 'el Service',
    });

    // api.addUsagePlan('UsagePlan', {
    //   name: 'basic',
    //   throttle: {
    //     rateLimit: 10,
    //     burstLimit: 2
    //   },
    //   quota: {
    //     limit: 20,
    //     period: Period.DAY
    //   }
    // })

    const auth = new CognitoUserPoolsAuthorizer(this, 'campaignAuthorizer', {
      cognitoUserPools: [userPool]
    });


    this.endpoints.map(({ lambda, path, httpMethod }) => {

      // Integrate the Lambda functions with the API Gateway resource
      const lambdaIntegration = new LambdaIntegration(lambda);

      // add the integration to the API Gateway
      const employeesResource = api.root.addResource(path);
      employeesResource.addMethod(httpMethod, lambdaIntegration, {
        authorizer: auth,
        authorizationType: AuthorizationType.COGNITO,
      });
      addCorsOptions(employeesResource);

    })

    // const eventbridgeIntegration = new Integration({
    //   type: IntegrationType.AWS,
    //   uri: `arn:aws:apigateway:${RegionInfo.name}:events:path//`,
    //   integrationHttpMethod: "POST",
    //   options: options,
    // });

    const orderModel = new Model(this, "orderModel", {
      restApi: api,
      contentType: "application/json",
      schema: {
        schema: JsonSchemaVersion.DRAFT7,
        title: "Order",
        type: JsonSchemaType.OBJECT,
        properties: {
          "product": {
            type: JsonSchemaType.STRING,
            description: "This is the product code"
          },
          "quantity": {
            type: JsonSchemaType.NUMBER,
            description: "How many item do you need?",
            minimum: 1,
            maximum: 5
          }
        },
        required: ["product", "quantity"]
      }
    });

    const ordersResource = api.root.addResource("order");
    // ordersResource.addMethod("POST", eventbridgeIntegration);
    ordersResource.addMethod("POST", eventBridgeRestApiIntegration,
      {
        authorizer: auth,
        authorizationType: AuthorizationType.COGNITO,
        methodResponses: [{ statusCode: "200" }],
        requestModels: { "application/json": orderModel },
        requestValidator: new RequestValidator(this, "orderValidator", {
          restApi: api,
          validateRequestBody: true
        })
      })

    addCorsOptions(ordersResource);
    // new CfnRoute(this, 'EventRoute', {
    //   apiId: api.restApiId,
    //   routeKey: 'POST /order',
    //   target: `integrations/${eventbridgeIntegration.ref}`,
    // });



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

