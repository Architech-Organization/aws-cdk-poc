import { Construct } from 'constructs';
import { AuthorizationType, AwsIntegration, CognitoUserPoolsAuthorizer, Integration, IntegrationType, IResource, JsonSchemaType, JsonSchemaVersion, LambdaIntegration, MockIntegration, Model, PassthroughBehavior, RequestValidator, RestApi } from "aws-cdk-lib/aws-apigateway";
import { Aws, Stack, StackProps } from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { IUserPool } from 'aws-cdk-lib/aws-cognito';
import { EventBus, Rule } from 'aws-cdk-lib/aws-events';
import { LogGroup } from 'aws-cdk-lib/aws-logs';
import { CloudWatchLogGroup } from 'aws-cdk-lib/aws-events-targets';
import { Effect, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { CfnIntegration, CfnRoute } from 'aws-cdk-lib/aws-apigatewayv2';
import { RegionInfo } from 'aws-cdk-lib/region-info';


export class GatewayStack extends Stack {

  private readonly endpoints: { lambda: NodejsFunction, path: string, httpMethod: string }[];

  constructor(scope: Construct, id: string, endpoints: { lambda: NodejsFunction, path: string, httpMethod: string }[], userPool: IUserPool, props?: StackProps) {
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
      const employeesApi = api.root.addResource(path);
      employeesApi.addMethod(httpMethod, lambdaIntegration, {
        authorizer: auth,
        authorizationType: AuthorizationType.COGNITO,
      });
      addCorsOptions(employeesApi);

    })

    const eventBus = new EventBus(this, 'MyEventBus', {
      eventBusName: 'MyEventBus'
    });

    /* LOGGING */
    const eventLoggerRule = new Rule(this, "EventLoggerRule", {
      description: "Log all events",
      eventPattern: { source: [`com.el.order`] },
      eventBus: eventBus
    });

    const logGroup = new LogGroup(this, 'EventLogGroup', {
      logGroupName: '/aws/events/MyEventBus',
    });

    eventLoggerRule.addTarget(new CloudWatchLogGroup(logGroup));


    /* There's no Eventbridge integration available as CDK L2 yet, so we have to use L1 and create Role, Integration and Route */
    const apiRole = new Role(this, 'EventBridgeIntegrationRole', {
      assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
    });

    apiRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        resources: [eventBus.eventBusArn],
        actions: ['events:PutEvents'],
      })
    );

    const options = {
      credentialsRole: apiRole,
      requestParameters: {
        "integration.request.header.X-Amz-Target": "'AWSEvents.PutEvents'",
        "integration.request.header.Content-Type": "'application/x-amz-json-1.1'"
      },
      requestTemplates: {
        "application/json": `{"Entries": [{"Source": "com.el.order", "Detail": "$util.escapeJavaScript($input.body)", "Resources": ["resource1", "resource2"], "DetailType": "myDetailType", "EventBusName": "${eventBus.eventBusName}"}]}`
      },
      integrationResponses: [{
        statusCode: "200",
        responseTemplates: {
          "application/json": ""
        }
      }]
    }

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

    const ordersApi = api.root.addResource("order");
    // ordersApi.addMethod("POST", eventbridgeIntegration);
    ordersApi.addMethod("POST", new Integration({
      type: IntegrationType.AWS,
      uri: `arn:aws:apigateway:${Aws.REGION}:events:path//`,
      integrationHttpMethod: "POST",
      options: options,
    }),
      {
        methodResponses: [{ statusCode: "200" }],
        requestModels: { "application/json": orderModel },
        requestValidator: new RequestValidator(this, "orderValidator", {
          restApi: api,
          validateRequestBody: true
        })
      })

    addCorsOptions(ordersApi);
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

