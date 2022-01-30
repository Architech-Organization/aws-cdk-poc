import { Aws, Stack, StackProps } from "aws-cdk-lib";
import { Integration, IntegrationType } from "aws-cdk-lib/aws-apigateway";
import { EventBus, Rule } from "aws-cdk-lib/aws-events";
import { CloudWatchLogGroup } from "aws-cdk-lib/aws-events-targets";
import { Effect, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { LogGroup } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";



export class EventBridgeStack extends Stack {

  public readonly eventBridgeRestApiIntegration: Integration;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id);


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

    /**
     * todo: get user cleams (username/email) and add it to eventbridge
     */
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

    this.eventBridgeRestApiIntegration = new Integration({
      type: IntegrationType.AWS,
      uri: `arn:aws:apigateway:${Aws.REGION}:events:path//`,
      integrationHttpMethod: "POST",
      options: options,
    })



  }

}