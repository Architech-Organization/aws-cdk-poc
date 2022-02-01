import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { AuthorizationType, AwsIntegration, CognitoUserPoolsAuthorizer, Integration, IntegrationOptions, IntegrationType, IResource, JsonSchemaType, JsonSchemaVersion, LambdaIntegration, MockIntegration, Model, PassthroughBehavior, RequestValidator, RestApi } from "aws-cdk-lib/aws-apigateway";
import { Aws, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { IUserPool } from 'aws-cdk-lib/aws-cognito';
import { Effect, Policy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
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


    const membersTable = new dynamodb.Table(this, 'members', {
      partitionKey: { name: 'memberCategory', type: dynamodb.AttributeType.STRING },
      tableName: 'members',
      removalPolicy: RemovalPolicy.DESTROY, // NOT recommended for production code
    });

    const putRole = new Role(this, 'putRole', {
      assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
    });
    const putPolicy = new Policy(this, 'putPolicy', {
      statements: [
        new PolicyStatement({
          actions: ['dynamodb:PutItem'],
          effect: Effect.ALLOW,
          resources: [membersTable.tableArn],
        }),
      ],
    });
    putRole.attachInlinePolicy(putPolicy);

    const errorResponses = [
      {
        selectionPattern: '400',
        statusCode: '400',
        responseTemplates: {
          'application/json': `{
            "error": "Bad input!"
          }`,
        },
      },
      {
        selectionPattern: '5\\d{2}',
        statusCode: '500',
        responseTemplates: {
          'application/json': `{
            "error": "Internal Service Error!"
          }`,
        },
      },
    ];

    const options: IntegrationOptions = {
      credentialsRole: putRole,
      requestParameters: {
        "integration.request.header.X-Amz-Target": "'DynamoDB_20120810.PutItem'",
        "integration.request.header.Content-Type": "'application/x-amz-json-1.1'"
      },
      requestTemplates: {
        "application/json": `{ "TableName": "members", "Item": { "memberId": { "S": "$context.requestId" }, "memberCategory": { "S": "$input.path('$.memberCategory')" }, "name": { "S": "$input.path('$.name')" }, "email": { "S": "$input.path('$.email')" } } }`
      },
      integrationResponses: [
        {
          statusCode: '201',
          responseTemplates: {
            'application/json': `{
              "requestId": "$context.requestId"
            }`,
          },
        },
        ...errorResponses,
      ],
    }

    const membersResource = api.root.addResource("members");
    membersResource.addMethod("POST", new AwsIntegration({
      action: 'PutItem',
      service: 'dynamodb',
      options: options
    }), { methodResponses: [{ statusCode: "201" }] });


    addCorsOptions(ordersResource);
    // new CfnRoute(this, 'EventRoute', {
    //   apiId: api.restApiId,
    //   routeKey: 'POST /order',
    //   target: `integrations/${eventbridgeIntegration.ref}`,
    // });

    /**
     * new Integration({
      type: IntegrationType.AWS,
      uri: `arn:aws:apigateway:${Aws.REGION}:dynamodb:path//`,
      integrationHttpMethod: "PutItem",
      options: options,
    })
     */


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

